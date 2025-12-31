// Uses Stripe REST API directly (no SDK) to avoid Deno compatibility issues
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

type BillingInterval = 'weekly' | 'monthly' | 'yearly';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('create-checkout invoked');

    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', auth.userId);

    const { interval } = await req.json() as { interval: BillingInterval };

    if (!interval || !['weekly', 'monthly', 'yearly'].includes(interval)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing interval' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
    const userEmail = userData?.user?.email;

    // Get subscription config to get price IDs
    const { data: config, error: configError } = await supabaseAdmin
      .from('subscription_config')
      .select('stripe_weekly_price_id, stripe_monthly_price_id, stripe_yearly_price_id')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('Error fetching subscription config:', configError);
      return new Response(
        JSON.stringify({ error: 'Subscription configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the appropriate price ID
    let priceId: string | null = null;
    switch (interval) {
      case 'weekly':
        priceId = config.stripe_weekly_price_id;
        break;
      case 'monthly':
        priceId = config.stripe_monthly_price_id;
        break;
      case 'yearly':
        priceId = config.stripe_yearly_price_id;
        break;
    }

    console.log('Price ID for', interval, ':', priceId);

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `No Stripe price configured for ${interval} billing` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.userId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create customer if needed using REST API
    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customerParams: Record<string, string> = {
        'metadata[supabase_user_id]': auth.userId,
      };
      if (userEmail) {
        customerParams['email'] = userEmail;
      }

      const customer = await stripeRequest('/customers', 'POST', customerParams);
      customerId = customer.id;
      console.log('Created customer:', customerId);

      // Save customer ID to subscription
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', auth.userId);
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://kiwi-meal-planner-production.up.railway.app';

    // Create checkout session using REST API
    const sessionParams: Record<string, string> = {
      'customer': customerId,
      'client_reference_id': auth.userId,
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${origin}/?subscription=success`,
      'cancel_url': `${origin}/?subscription=cancelled`,
      'subscription_data[metadata][supabase_user_id]': auth.userId,
      'allow_promotion_codes': 'true',
    };

    console.log('Creating checkout session...');
    const session = await stripeRequest('/checkout/sessions', 'POST', sessionParams);
    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
