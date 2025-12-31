// Cancel Subscription with Discount Offer - Uses Stripe REST API
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
    console.log('cancel-subscription invoked');

    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, reason } = await req.json() as {
      action: 'get-offer' | 'accept-offer' | 'cancel';
      reason?: string;
    };

    if (!action || !['get-offer', 'accept-offer', 'cancel'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
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
        JSON.stringify({ error: 'No active Stripe subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get cancel offer config
    const { data: config } = await supabaseAdmin
      .from('subscription_config')
      .select('cancel_offer_enabled, cancel_offer_discount_percent, cancel_offer_duration_months, cancel_offer_message')
      .single();

    const offerEnabled = config?.cancel_offer_enabled ?? true;
    const discountPercent = config?.cancel_offer_discount_percent ?? 50;
    const durationMonths = config?.cancel_offer_duration_months ?? 3;
    const offerMessage = config?.cancel_offer_message ?? 'Before you go, we\'d like to offer you a special discount!';

    if (action === 'get-offer') {
      // Return the cancel offer details
      if (!offerEnabled) {
        return new Response(
          JSON.stringify({
            offerAvailable: false,
            message: 'No special offers available at this time'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          offerAvailable: true,
          discountPercent,
          durationMonths,
          message: offerMessage
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'accept-offer') {
      if (!offerEnabled) {
        return new Response(
          JSON.stringify({ error: 'Offer not available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create a coupon in Stripe
      const couponId = `retention_${auth.userId.substring(0, 8)}_${Date.now()}`;
      await stripeRequest('/coupons', 'POST', {
        'id': couponId,
        'percent_off': discountPercent.toString(),
        'duration': 'repeating',
        'duration_in_months': durationMonths.toString(),
        'name': `Retention offer - ${discountPercent}% off for ${durationMonths} months`,
      });

      // Apply the coupon to the subscription
      await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
        'coupon': couponId,
      });

      // If subscription was set to cancel, remove the cancellation
      if (subscription.cancel_at_period_end) {
        await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
          'cancel_at_period_end': 'false',
        });
      }

      // Update our database
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: false,
        })
        .eq('user_id', auth.userId);

      console.log(`User ${auth.userId} accepted retention offer: ${discountPercent}% off for ${durationMonths} months`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Great! You'll receive ${discountPercent}% off for the next ${durationMonths} months.`,
          discountPercent,
          durationMonths
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Cancel subscription at period end
      await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
        'cancel_at_period_end': 'true',
      });

      // Update our database
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
        })
        .eq('user_id', auth.userId);

      console.log(`User ${auth.userId} cancelled subscription. Reason: ${reason || 'Not provided'}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Your subscription will be cancelled at the end of your current billing period.',
          cancelAt: subscription.stripe_current_period_end
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
