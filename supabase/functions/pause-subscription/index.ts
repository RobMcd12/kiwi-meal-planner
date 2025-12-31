// Pause/Resume Subscription - Uses Stripe REST API
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.log('Auth failed:', error?.message || 'No user');
    return null;
  }

  return { userId: user.id };
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Stripe REST API helper
async function stripeRequest(endpoint: string, method: string, body?: Record<string, string>): Promise<any> {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('Stripe API error:', data);
    throw new Error(data.error?.message || 'Stripe API error');
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('pause-subscription invoked');

    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, resumeDate } = await req.json() as {
      action: 'pause' | 'resume';
      resumeDate?: string;
    };

    if (!action || !['pause', 'resume'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "pause" or "resume"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active Stripe subscription to pause/resume' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pause') {
      // Validate resume date
      if (!resumeDate) {
        return new Response(
          JSON.stringify({ error: 'Resume date is required for pausing' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const resumeAt = new Date(resumeDate);
      const now = new Date();
      const maxPauseDays = 90;
      const maxResumeDate = new Date(now.getTime() + maxPauseDays * 24 * 60 * 60 * 1000);

      if (resumeAt <= now) {
        return new Response(
          JSON.stringify({ error: 'Resume date must be in the future' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (resumeAt > maxResumeDate) {
        return new Response(
          JSON.stringify({ error: `Maximum pause duration is ${maxPauseDays} days` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Pause subscription in Stripe using pause_collection
      const resumeTimestamp = Math.floor(resumeAt.getTime() / 1000);
      await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
        'pause_collection[behavior]': 'void',
        'pause_collection[resumes_at]': resumeTimestamp.toString(),
      });

      // Update our database
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          paused_at: new Date().toISOString(),
          pause_resumes_at: resumeAt.toISOString(),
          status: 'active', // Still considered active but paused
        })
        .eq('user_id', auth.userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      console.log(`Subscription paused for user ${auth.userId}, resumes at ${resumeDate}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription paused',
          pausedAt: new Date().toISOString(),
          resumesAt: resumeAt.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Resume subscription
      if (!subscription.paused_at) {
        return new Response(
          JSON.stringify({ error: 'Subscription is not paused' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Resume subscription in Stripe by removing pause_collection
      await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
        'pause_collection': '',
      });

      // Update our database
      const { error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          paused_at: null,
          pause_resumes_at: null,
        })
        .eq('user_id', auth.userId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw updateError;
      }

      console.log(`Subscription resumed for user ${auth.userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription resumed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Pause subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
