/**
 * Server-Side Subscription Validation Edge Function
 *
 * Validates user subscription status and feature access server-side
 * to prevent client-side bypassing of subscription limits.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors, getCorsHeaders } from '../_shared/cors.ts';

// Feature types that require Pro subscription
type ProFeature =
  | 'unlimited_recipes'
  | 'ai_generation'
  | 'video_recipes'
  | 'pantry_scan'
  | 'advanced_macros'
  | 'google_drive_backup';

interface ValidationRequest {
  feature?: ProFeature;
  action?: 'check_pro' | 'can_create_recipe' | 'check_feature';
}

interface SubscriptionData {
  tier: string;
  status: string;
  admin_granted_pro: boolean;
  admin_grant_expires_at: string | null;
  stripe_current_period_end: string | null;
  trial_ends_at: string | null;
}

interface ValidationResponse {
  hasPro: boolean;
  canProceed: boolean;
  reason?: string;
  recipeCount?: number;
  recipeLimit?: number;
  subscription?: {
    tier: string;
    status: string;
    expiresAt?: string;
  };
}

const SUPER_ADMIN_EMAIL = Deno.env.get('SUPER_ADMIN_EMAIL') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: responseHeaders,
    });
  }

  try {
    // Create Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', hasPro: false, canProceed: false }),
        {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request
    const body: ValidationRequest = await req.json().catch(() => ({}));
    const action = body.action || 'check_pro';

    // Super admin always has Pro
    if (user.email === SUPER_ADMIN_EMAIL && SUPER_ADMIN_EMAIL !== '') {
      return new Response(
        JSON.stringify({
          hasPro: true,
          canProceed: true,
          subscription: {
            tier: 'pro',
            status: 'active',
          },
        } as ValidationResponse),
        {
          status: 200,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use service role client for querying subscription data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('tier, status, admin_granted_pro, admin_grant_expires_at, stripe_current_period_end, trial_ends_at')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError);
    }

    // Get subscription config for limits
    const { data: config } = await supabaseAdmin
      .from('subscription_config')
      .select('free_recipe_limit')
      .limit(1)
      .single();

    const freeRecipeLimit = config?.free_recipe_limit || 20;

    // Calculate if user has Pro access
    const hasPro = checkHasProAccess(subscription);

    // Handle different actions
    switch (action) {
      case 'check_pro':
        return new Response(
          JSON.stringify({
            hasPro,
            canProceed: hasPro,
            subscription: subscription ? {
              tier: subscription.tier,
              status: subscription.status,
              expiresAt: subscription.stripe_current_period_end || subscription.trial_ends_at,
            } : undefined,
          } as ValidationResponse),
          {
            status: 200,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          }
        );

      case 'can_create_recipe':
        // Get current recipe count
        const { count: recipeCount } = await supabaseAdmin
          .from('favorite_meals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const currentCount = recipeCount || 0;
        const canCreate = hasPro || currentCount < freeRecipeLimit;

        return new Response(
          JSON.stringify({
            hasPro,
            canProceed: canCreate,
            recipeCount: currentCount,
            recipeLimit: freeRecipeLimit,
            reason: canCreate ? undefined : `You have reached the free limit of ${freeRecipeLimit} recipes. Upgrade to Pro for unlimited recipes.`,
            subscription: subscription ? {
              tier: subscription.tier,
              status: subscription.status,
            } : undefined,
          } as ValidationResponse),
          {
            status: 200,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          }
        );

      case 'check_feature':
        const feature = body.feature;
        if (!feature) {
          return new Response(
            JSON.stringify({ error: 'Feature not specified', hasPro: false, canProceed: false }),
            {
              status: 400,
              headers: { ...responseHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // All Pro features require hasPro
        const canUseFeature = hasPro;

        return new Response(
          JSON.stringify({
            hasPro,
            canProceed: canUseFeature,
            reason: canUseFeature ? undefined : `The ${feature.replace(/_/g, ' ')} feature requires a Pro subscription.`,
            subscription: subscription ? {
              tier: subscription.tier,
              status: subscription.status,
            } : undefined,
          } as ValidationResponse),
          {
            status: 200,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', hasPro: false, canProceed: false }),
          {
            status: 400,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          }
        );
    }
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', hasPro: false, canProceed: false }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Check if user has Pro access based on subscription data
 */
function checkHasProAccess(subscription: SubscriptionData | null): boolean {
  if (!subscription) return false;

  const now = new Date();

  // Check admin grant
  if (subscription.admin_granted_pro) {
    if (!subscription.admin_grant_expires_at) {
      return true; // No expiration
    }
    if (new Date(subscription.admin_grant_expires_at) > now) {
      return true;
    }
  }

  // Check Pro tier with valid status
  if (subscription.tier === 'pro') {
    if (subscription.status === 'active') {
      // Check Stripe period end if applicable
      if (subscription.stripe_current_period_end) {
        return new Date(subscription.stripe_current_period_end) > now;
      }
      return true;
    }

    // Check trial
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      return new Date(subscription.trial_ends_at) > now;
    }
  }

  return false;
}
