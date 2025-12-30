import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// Verify Stripe webhook signature
async function verifySignature(req: Request, body: string): Promise<Stripe.Event | null> {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return null;

  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
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
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error('Missing userId or subscriptionId in checkout session');
    return;
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      tier: 'pro',
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: subscription.items.data[0]?.price.id,
      stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      // Clear trial if switching from trial
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
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const status = mapStripeStatus(subscription.status);

  await updateSubscription(subscription.id, {
    status,
    stripe_price_id: subscription.items.data[0]?.price.id,
    stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    tier: status === 'cancelled' || status === 'expired' ? 'free' : 'pro',
  });

  console.log(`Subscription ${subscription.id} updated to status: ${status}`);
}

// Handle customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
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

// Handle invoice.payment_failed
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Log the failure but don't immediately cancel
  // Stripe will handle retries and eventual cancellation
  console.log(`Payment failed for subscription ${subscriptionId}`);
}

// Map Stripe subscription status to our status
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'active'; // Keep active during grace period
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'expired';
  }
}

Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const event = await verifySignature(req, body);

    if (!event) {
      return new Response('Invalid signature', { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
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
