// Sync subscription from Stripe - fallback for when webhooks fail
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

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Stripe REST API helper
async function stripeGet(endpoint: string): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Stripe API error');
  }

  return response.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('sync-subscription invoked');

    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', auth.userId);

    // Get user's current subscription record
    const { data: userSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', auth.userId)
      .single();

    if (subError) {
      console.error('Error fetching user subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Subscription record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = userSub?.stripe_customer_id;

    if (!customerId) {
      console.log('No Stripe customer ID found for user');
      return new Response(
        JSON.stringify({ synced: false, message: 'No Stripe customer linked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer's subscriptions from Stripe
    console.log('Fetching subscriptions for customer:', customerId);
    const subscriptions = await stripeGet(`/subscriptions?customer=${customerId}&status=all&limit=1`);

    if (!subscriptions.data || subscriptions.data.length === 0) {
      console.log('No Stripe subscriptions found for customer');
      return new Response(
        JSON.stringify({ synced: false, message: 'No active Stripe subscription' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripeSub = subscriptions.data[0];
    console.log('Found Stripe subscription:', stripeSub.id, 'status:', stripeSub.status);

    // Map Stripe status to our status
    let tier: 'free' | 'pro' = 'free';
    let status: 'active' | 'cancelled' | 'expired' | 'trialing' = 'active';

    switch (stripeSub.status) {
      case 'active':
      case 'trialing':
        tier = 'pro';
        status = stripeSub.status === 'trialing' ? 'trialing' : 'active';
        break;
      case 'past_due':
      case 'unpaid':
        tier = 'pro'; // Still give access, payment is being retried
        status = 'active';
        break;
      case 'canceled':
      case 'incomplete_expired':
        tier = 'free';
        status = 'cancelled';
        break;
      default:
        tier = 'free';
        status = 'expired';
    }

    // Update the subscription record
    const updateData = {
      tier,
      status,
      stripe_subscription_id: stripeSub.id,
      stripe_price_id: stripeSub.items?.data?.[0]?.price?.id || null,
      stripe_current_period_end: stripeSub.current_period_end
        ? new Date(stripeSub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSub.cancel_at_period_end || false,
      trial_ends_at: stripeSub.trial_end
        ? new Date(stripeSub.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    console.log('Updating subscription with:', JSON.stringify(updateData, null, 2));

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', auth.userId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to sync subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription synced successfully for user:', auth.userId);

    return new Response(
      JSON.stringify({
        synced: true,
        tier,
        status,
        subscription_id: stripeSub.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync subscription error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync subscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
