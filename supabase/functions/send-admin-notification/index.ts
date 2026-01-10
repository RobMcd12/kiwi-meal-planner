/**
 * Send Admin Notification Edge Function
 *
 * Creates notifications for admins based on system events.
 * Optionally sends email notifications to admins who have enabled them.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors, getCorsHeaders } from '../_shared/cors.ts';

type NotificationType =
  | 'impersonation_started'
  | 'impersonation_ended'
  | 'new_user_signup'
  | 'subscription_changed'
  | 'subscription_cancelled'
  | 'new_feedback'
  | 'security_alert';

interface NotificationRequest {
  notificationType: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  targetAdminId?: string; // If specified, only notify this admin
}

// Map notification types to settings fields
const NOTIFICATION_SETTINGS_MAP: Record<NotificationType, string> = {
  impersonation_started: 'notify_on_impersonation',
  impersonation_ended: 'notify_on_impersonation',
  new_user_signup: 'notify_on_user_signup',
  subscription_changed: 'notify_on_subscription_change',
  subscription_cancelled: 'notify_on_subscription_change',
  new_feedback: 'notify_on_feedback',
  security_alert: 'notify_on_impersonation', // Security alerts always use impersonation setting
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: NotificationRequest = await req.json();
    const { notificationType, title, message, metadata, targetAdminId } = body;

    if (!notificationType || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: notificationType, title, message' }),
        {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all admin users (or specific admin if targetAdminId specified)
    let adminQuery = supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('is_admin', true);

    if (targetAdminId) {
      adminQuery = adminQuery.eq('id', targetAdminId);
    }

    const { data: admins, error: adminError } = await adminQuery;

    if (adminError) {
      console.error('Error fetching admins:', adminError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch admins' }),
        {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        {
          status: 200,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get notification settings for each admin
    const adminIds = admins.map(a => a.id);
    const { data: settings } = await supabaseAdmin
      .from('admin_notification_settings')
      .select('*')
      .in('admin_user_id', adminIds);

    // Create a map of admin settings
    const settingsMap = new Map(
      (settings || []).map(s => [s.admin_user_id, s])
    );

    // Determine which admins should receive this notification
    const settingsField = NOTIFICATION_SETTINGS_MAP[notificationType];
    const notificationsToCreate: Array<{
      admin_user_id: string;
      notification_type: string;
      title: string;
      message: string;
      metadata: Record<string, unknown>;
    }> = [];

    const emailsToSend: Array<{ email: string; title: string; message: string }> = [];

    for (const admin of admins) {
      const adminSettings = settingsMap.get(admin.id);

      // Check if admin wants this type of notification
      // Default to true if no settings exist
      const wantsNotification = adminSettings
        ? adminSettings[settingsField] !== false
        : true;

      if (wantsNotification) {
        notificationsToCreate.push({
          admin_user_id: admin.id,
          notification_type: notificationType,
          title,
          message,
          metadata: metadata || {},
        });

        // Check if admin wants email notifications
        const wantsEmail = adminSettings
          ? adminSettings.email_notifications !== false
          : true;

        if (wantsEmail && admin.email) {
          emailsToSend.push({
            email: admin.email,
            title,
            message,
          });
        }
      }
    }

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('admin_notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
      }
    }

    // Send emails (non-blocking)
    for (const email of emailsToSend) {
      // Call send-email function asynchronously
      supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email.email,
          subject: `[Kiwi Meal Planner] ${email.title}`,
          text: email.message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">${email.title}</h2>
              <p style="color: #334155;">${email.message}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #94a3b8; font-size: 12px;">
                This is an automated notification from Kiwi Meal Planner.
                You can manage your notification preferences in the admin dashboard.
              </p>
            </div>
          `,
        },
      }).catch(err => console.error('Error sending notification email:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsToCreate.length,
        emailsSent: emailsToSend.length,
      }),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      }
    );
  }
});
