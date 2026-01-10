/**
 * Admin Notification Service
 *
 * Handles creating and managing admin notifications for various system events.
 * Notifications are stored in the database and can trigger email alerts.
 */

import { supabase, isSupabaseConfigured } from './authService';

export type NotificationType =
  | 'impersonation_started'
  | 'impersonation_ended'
  | 'new_user_signup'
  | 'subscription_changed'
  | 'subscription_cancelled'
  | 'new_feedback'
  | 'security_alert';

export interface AdminNotification {
  id: string;
  adminUserId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AdminNotificationSettings {
  notifyOnImpersonation: boolean;
  notifyOnUserSignup: boolean;
  notifyOnSubscriptionChange: boolean;
  notifyOnFeedback: boolean;
  emailNotifications: boolean;
}

/**
 * Get unread notification count for an admin
 */
export const getUnreadNotificationCount = async (adminUserId: string): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;

  try {
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('admin_user_id', adminUserId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error fetching notification count:', err);
    return 0;
  }
};

/**
 * Get notifications for an admin
 */
export const getAdminNotifications = async (
  adminUserId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<AdminNotification[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data || []).map(mapNotificationRow);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error marking notification read:', err);
    return false;
  }
};

/**
 * Mark all notifications as read for an admin
 */
export const markAllNotificationsRead = async (adminUserId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('admin_user_id', adminUserId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    return false;
  }
};

/**
 * Get admin notification settings
 */
export const getNotificationSettings = async (
  adminUserId: string
): Promise<AdminNotificationSettings | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('admin_notification_settings')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, return defaults
        return {
          notifyOnImpersonation: true,
          notifyOnUserSignup: false,
          notifyOnSubscriptionChange: true,
          notifyOnFeedback: true,
          emailNotifications: true,
        };
      }
      console.error('Error fetching notification settings:', error);
      return null;
    }

    return {
      notifyOnImpersonation: data.notify_on_impersonation,
      notifyOnUserSignup: data.notify_on_user_signup,
      notifyOnSubscriptionChange: data.notify_on_subscription_change,
      notifyOnFeedback: data.notify_on_feedback,
      emailNotifications: data.email_notifications,
    };
  } catch (err) {
    console.error('Error fetching notification settings:', err);
    return null;
  }
};

/**
 * Update admin notification settings
 */
export const updateNotificationSettings = async (
  adminUserId: string,
  settings: Partial<AdminNotificationSettings>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('admin_notification_settings')
      .upsert({
        admin_user_id: adminUserId,
        notify_on_impersonation: settings.notifyOnImpersonation,
        notify_on_user_signup: settings.notifyOnUserSignup,
        notify_on_subscription_change: settings.notifyOnSubscriptionChange,
        notify_on_feedback: settings.notifyOnFeedback,
        email_notifications: settings.emailNotifications,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'admin_user_id',
      });

    if (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating notification settings:', err);
    return false;
  }
};

/**
 * Create a notification for admins (called from Edge Functions)
 * This function is for internal use - actual creation happens server-side
 */
export const createNotificationForAdmins = async (
  notificationType: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    // Call Edge Function to create notifications
    const { error } = await supabase.functions.invoke('send-admin-notification', {
      body: {
        notificationType,
        title,
        message,
        metadata,
      },
    });

    if (error) {
      console.error('Error creating admin notification:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error creating admin notification:', err);
    return false;
  }
};

/**
 * Notify admins about impersonation
 */
export const notifyImpersonationStarted = async (
  adminEmail: string,
  targetUserEmail: string,
  targetUserId: string
): Promise<void> => {
  await createNotificationForAdmins(
    'impersonation_started',
    'User Impersonation Started',
    `Admin ${adminEmail} started impersonating user ${targetUserEmail}`,
    {
      adminEmail,
      targetUserEmail,
      targetUserId,
      timestamp: new Date().toISOString(),
    }
  );
};

/**
 * Notify admins about impersonation end
 */
export const notifyImpersonationEnded = async (
  adminEmail: string,
  targetUserEmail: string
): Promise<void> => {
  await createNotificationForAdmins(
    'impersonation_ended',
    'User Impersonation Ended',
    `Admin ${adminEmail} stopped impersonating user ${targetUserEmail}`,
    {
      adminEmail,
      targetUserEmail,
      timestamp: new Date().toISOString(),
    }
  );
};

// Helper function to map database row to notification object
function mapNotificationRow(row: Record<string, unknown>): AdminNotification {
  return {
    id: row.id as string,
    adminUserId: row.admin_user_id as string,
    notificationType: row.notification_type as NotificationType,
    title: row.title as string,
    message: row.message as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
    read: row.read as boolean,
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
  };
}
