// Uses Stripe REST API directly (no SDK) to avoid Deno compatibility issues
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get('Authorization');
  console.log('Auth header present:', !!authHeader);
  if (authHeader) {
    console.log('Auth header starts with Bearer:', authHeader.startsWith('Bearer '));
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader ?? '' },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    console.log('Auth failed:', error?.message || 'No user');
    console.log('Error status:', error?.status);
    return null;
  }

  console.log('Auth successful, user:', user.id);
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('create-portal invoked');

    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', auth.userId);

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.userId)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscription?.stripe_customer_id) {
      console.log('No Stripe customer ID found for user');
      return new Response(
        JSON.stringify({ error: 'No active subscription found. Please subscribe first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the origin for redirect URL
    const origin = req.headers.get('origin') || 'https://kiwi-meal-planner-production.up.railway.app';

    // Create customer portal session using REST API
    const sessionParams: Record<string, string> = {
      'customer': subscription.stripe_customer_id,
      'return_url': `${origin}/?settings=subscription`,
    };

    console.log('Creating portal session for customer:', subscription.stripe_customer_id);
    const session = await stripeRequest('/billing_portal/sessions', 'POST', sessionParams);
    console.log('Portal session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Portal error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create portal session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
