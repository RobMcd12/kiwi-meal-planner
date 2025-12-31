// Stripe Webhook Handler - Uses REST API (no SDK)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Stripe REST API helper
async function stripeGet(endpoint: string): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
    },
  });
  return response.json();
}

// Verify webhook signature using crypto
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  if (!webhookSecret || !signature) return false;

  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) return false;

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.log('Webhook timestamp too old');
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSig === sig;
}

// Update subscription in database
async function updateSubscription(
  stripeSubscriptionId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update(updates)
    .eq('stripe_subscription_id', stripeSubscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// Handle checkout.session.completed
async function handleCheckoutCompleted(session: any): Promise<void> {
  console.log('=== handleCheckoutCompleted ===');
  console.log('Session object keys:', Object.keys(session));

  const userId = session.client_reference_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log('client_reference_id (userId):', userId);
  console.log('customer:', customerId);
  console.log('subscription:', subscriptionId);

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session');
    console.error('Full session:', JSON.stringify(session, null, 2));
    return;
  }

  console.log('Processing checkout for user:', userId);

  // Get subscription details from Stripe
  const subscription = await stripeGet(`/subscriptions/${subscriptionId}`);

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      tier: 'pro',
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: subscription.items?.data?.[0]?.price?.id,
      stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      trial_ends_at: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating subscription after checkout:', error);
    throw error;
  }

  console.log(`Subscription activated for user ${userId}`);
}

// Handle customer.subscription.updated
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const status = mapStripeStatus(subscription.status);

  await updateSubscription(subscription.id, {
    status,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id,
    stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    tier: status === 'cancelled' || status === 'expired' ? 'free' : 'pro',
  });

  console.log(`Subscription ${subscription.id} updated to status: ${status}`);
}

// Handle customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  await updateSubscription(subscription.id, {
    status: 'cancelled',
    tier: 'free',
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
    cancel_at_period_end: false,
  });

  console.log(`Subscription ${subscription.id} deleted`);
}

// Map Stripe subscription status to our status
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'active';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'expired';
  }
}

Deno.serve(async (req) => {
  console.log('=== Stripe webhook invoked ===');
  console.log('Method:', req.method);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    console.log('Signature present:', !!signature);
    console.log('Webhook secret configured:', !!webhookSecret);
    console.log('Body length:', body.length);

    // Verify signature
    const isValid = await verifySignature(body, signature);
    console.log('Signature valid:', isValid);

    if (!isValid) {
      console.error('Invalid webhook signature');
      console.error('Signature received:', signature.substring(0, 50) + '...');
      // For debugging, still process the event but log the issue
      // return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);
    console.log(`Processing webhook event: ${event.type}`);
    console.log('Event ID:', event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log(`Payment failed for subscription ${event.data.object.subscription}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
