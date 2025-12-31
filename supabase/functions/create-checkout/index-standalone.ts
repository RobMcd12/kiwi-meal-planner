// Self-contained version for Supabase Dashboard deployment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

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
    return null;
  }

  return { userId: user.id };
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

type BillingInterval = 'weekly' | 'monthly' | 'yearly';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Create customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: auth.userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to subscription
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', auth.userId);
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://kiwi-meal-planner-production.up.railway.app';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: auth.userId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/?subscription=success`,
      cancel_url: `${origin}/?subscription=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: auth.userId,
        },
      },
      allow_promotion_codes: true,
    });

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
