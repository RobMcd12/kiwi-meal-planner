// DEBUG version - logs everything to help diagnose 401 errors
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log environment variables (existence only, not values)
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_ANON_KEY exists:', !!Deno.env.get('SUPABASE_ANON_KEY'));
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('STRIPE_SECRET_KEY exists:', !!Deno.env.get('STRIPE_SECRET_KEY'));

    // Log request headers
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header exists:', !!authHeader);
    console.log('Authorization header starts with Bearer:', authHeader?.startsWith('Bearer ') || false);

    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader ?? '' },
        },
      }
    );

    // Try to get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    console.log('Auth result - user exists:', !!user);
    console.log('Auth result - error:', authError?.message || 'none');

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          debug: {
            authError: authError?.message || null,
            hasAuthHeader: !!authHeader,
            headerFormat: authHeader?.startsWith('Bearer ') || false,
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User authenticated successfully
    console.log('User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));

    const { interval } = body as { interval: string };

    if (!interval || !['weekly', 'monthly', 'yearly'].includes(interval)) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing interval', received: interval }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get subscription config
    const { data: config, error: configError } = await supabaseAdmin
      .from('subscription_config')
      .select('stripe_weekly_price_id, stripe_monthly_price_id, stripe_yearly_price_id')
      .limit(1)
      .single();

    console.log('Config fetched:', !!config, 'Error:', configError?.message || 'none');

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Subscription configuration not found', details: configError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get price ID
    let priceId: string | null = null;
    switch (interval) {
      case 'weekly': priceId = config.stripe_weekly_price_id; break;
      case 'monthly': priceId = config.stripe_monthly_price_id; break;
      case 'yearly': priceId = config.stripe_yearly_price_id; break;
    }

    console.log('Price ID for', interval, ':', priceId || 'NOT SET');

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `No Stripe price configured for ${interval} billing` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing customer ID
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    console.log('Existing customer ID:', subscription?.stripe_customer_id || 'none');

    // Get user email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const userEmail = userData?.user?.email;
    console.log('User email:', userEmail || 'not found');

    let customerId = subscription?.stripe_customer_id;

    // Stripe REST API helper
    const stripeRequest = async (endpoint: string, method: string, body?: Record<string, string>) => {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      if (body) {
        options.body = new URLSearchParams(body).toString();
      }

      const response = await fetch(`https://api.stripe.com/v1${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        console.error('Stripe API error:', JSON.stringify(data));
        throw new Error(data.error?.message || 'Stripe API error');
      }

      return data;
    };

    // Create customer if needed
    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customerParams: Record<string, string> = {
        'metadata[supabase_user_id]': user.id,
      };
      if (userEmail) {
        customerParams['email'] = userEmail;
      }

      const customer = await stripeRequest('/customers', 'POST', customerParams);
      customerId = customer.id;
      console.log('Created customer:', customerId);

      // Save customer ID
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'https://www.kiwimealplanner.co.nz';
    console.log('Using origin:', origin);

    const sessionParams: Record<string, string> = {
      'customer': customerId,
      'client_reference_id': user.id,
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${origin}/?subscription=success`,
      'cancel_url': `${origin}/?subscription=cancelled`,
      'subscription_data[metadata][supabase_user_id]': user.id,
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
      JSON.stringify({ error: 'Failed to create checkout session', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
