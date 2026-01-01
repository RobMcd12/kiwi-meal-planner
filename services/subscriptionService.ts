import { supabase, isSupabaseConfigured } from './authService';
import { isSuperAdmin } from './adminService';
import type {
  SubscriptionConfig,
  UserSubscription,
  SubscriptionState,
  ProFeature,
  BillingInterval,
  AdminSubscriptionGrant
} from '../types';

// Super admin email - always has Pro
const SUPER_ADMIN_EMAIL = 'rob@unicloud.co.nz';

// ============================================
// SUBSCRIPTION CONFIGURATION
// ============================================

/**
 * Get the global subscription configuration
 */
export const getSubscriptionConfig = async (): Promise<SubscriptionConfig | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('subscription_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching subscription config:', error);
      return null;
    }

    return mapConfigRow(data);
  } catch (err) {
    console.error('Error fetching subscription config:', err);
    return null;
  }
};

/**
 * Update subscription configuration (admin only)
 */
export const updateSubscriptionConfig = async (
  updates: Partial<{
    trialPeriodDays: number;
    priceWeeklyCents: number;
    priceMonthlyCents: number;
    priceYearlyCents: number;
    yearlyDiscountPercent: number;
    freeRecipeLimit: number;
    stripeWeeklyPriceId: string;
    stripeMonthlyPriceId: string;
    stripeYearlyPriceId: string;
    cancelOfferEnabled: boolean;
    cancelOfferDiscountPercent: number;
    cancelOfferDurationMonths: number;
    cancelOfferMessage: string;
  }>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('subscription_config')
      .update({
        trial_period_days: updates.trialPeriodDays,
        price_weekly_cents: updates.priceWeeklyCents,
        price_monthly_cents: updates.priceMonthlyCents,
        price_yearly_cents: updates.priceYearlyCents,
        yearly_discount_percent: updates.yearlyDiscountPercent,
        free_recipe_limit: updates.freeRecipeLimit,
        stripe_weekly_price_id: updates.stripeWeeklyPriceId,
        stripe_monthly_price_id: updates.stripeMonthlyPriceId,
        stripe_yearly_price_id: updates.stripeYearlyPriceId,
        cancel_offer_enabled: updates.cancelOfferEnabled,
        cancel_offer_discount_percent: updates.cancelOfferDiscountPercent,
        cancel_offer_duration_months: updates.cancelOfferDurationMonths,
        cancel_offer_message: updates.cancelOfferMessage,
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      console.error('Error updating subscription config:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating subscription config:', err);
    return false;
  }
};

// ============================================
// USER SUBSCRIPTION
// ============================================

/**
 * Get user's subscription
 */
export const getUserSubscription = async (userId?: string): Promise<UserSubscription | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Get current user if userId not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No subscription found is not an error
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching subscription:', error);
      return null;
    }

    return mapSubscriptionRow(data);
  } catch (err) {
    console.error('Error fetching subscription:', err);
    return null;
  }
};

/**
 * Check if user has Pro access (considering all sources)
 */
export const checkHasPro = async (userId?: string): Promise<boolean> => {
  // First check if this is the super admin by getting current user's email
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === SUPER_ADMIN_EMAIL) {
      return true;
    }
    userId = user?.id;
  }

  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  // Check admin grant
  if (subscription.adminGrantedPro) {
    if (!subscription.adminGrantExpiresAt || new Date(subscription.adminGrantExpiresAt) > new Date()) {
      return true;
    }
  }

  // Check Pro tier with valid status
  if (subscription.tier === 'pro') {
    if (subscription.status === 'active') {
      // Check Stripe period end if applicable
      if (subscription.stripeCurrentPeriodEnd) {
        return new Date(subscription.stripeCurrentPeriodEnd) > new Date();
      }
      return true;
    }
    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      return new Date(subscription.trialEndsAt) > new Date();
    }
  }

  return false;
};

/**
 * Check if user can use a specific Pro feature
 */
export const canUseFeature = async (feature: ProFeature, userId?: string): Promise<boolean> => {
  // Unlimited recipes requires separate logic (handled by canCreateRecipe)
  if (feature === 'unlimited_recipes') {
    return checkHasPro(userId);
  }

  // All other Pro features require Pro subscription
  return checkHasPro(userId);
};

/**
 * Get user's recipe count
 */
export const getRecipeCount = async (userId?: string): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;

  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      userId = user.id;
    }

    const { count, error } = await supabase
      .from('favorite_meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error counting recipes:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Error counting recipes:', err);
    return 0;
  }
};

/**
 * Check if user can create a new recipe
 */
export const canCreateRecipe = async (userId?: string): Promise<boolean> => {
  // Pro users have unlimited recipes
  const hasPro = await checkHasPro(userId);
  if (hasPro) return true;

  // Free users have a limit
  const [recipeCount, config] = await Promise.all([
    getRecipeCount(userId),
    getSubscriptionConfig()
  ]);

  const limit = config?.freeRecipeLimit || 20;
  return recipeCount < limit;
};

/**
 * Get full subscription state (for context providers)
 */
export const getSubscriptionState = async (userId?: string): Promise<SubscriptionState> => {
  // Check if super admin first
  let isSuperAdminUser = false;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === SUPER_ADMIN_EMAIL) {
      isSuperAdminUser = true;
    }
    userId = user?.id;
  }

  const [subscription, config, recipeCount] = await Promise.all([
    getUserSubscription(userId),
    getSubscriptionConfig(),
    getRecipeCount(userId)
  ]);

  // Super admin always has Pro
  const hasPro = isSuperAdminUser || (subscription ? checkHasProFromSubscription(subscription) : false);
  const recipeLimit = config?.freeRecipeLimit || 20;

  let daysLeftInTrial: number | null = null;
  let isTrialing = false;

  if (subscription?.status === 'trialing' && subscription.trialEndsAt) {
    isTrialing = true;
    const trialEnd = new Date(subscription.trialEndsAt);
    const now = new Date();
    daysLeftInTrial = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return {
    subscription,
    config,
    hasPro,
    isTrialing,
    daysLeftInTrial,
    recipeCount,
    recipeLimit,
    canCreateRecipe: hasPro || recipeCount < recipeLimit
  };
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Grant Pro access to a user (admin only)
 */
export const grantProAccess = async (
  userId: string,
  expiresAt?: string | null,
  note?: string | null,
  adminUserId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    // Get current admin user if not provided
    if (!adminUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      adminUserId = user.id;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        admin_granted_pro: true,
        admin_granted_by: adminUserId,
        admin_grant_expires_at: expiresAt || null,
        admin_grant_note: note || null,
        tier: 'pro',
        status: 'active'
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error granting Pro access:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error granting Pro access:', err);
    return false;
  }
};

/**
 * Revoke admin-granted Pro access (admin only)
 */
export const revokeProAccess = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        admin_granted_pro: false,
        admin_granted_by: null,
        admin_grant_expires_at: null,
        admin_grant_note: null,
        // Only downgrade to free if no Stripe subscription
        tier: 'free',
        status: 'active'
      })
      .eq('user_id', userId)
      .is('stripe_subscription_id', null);

    if (error) {
      console.error('Error revoking Pro access:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error revoking Pro access:', err);
    return false;
  }
};

/**
 * Get all subscriptions (admin only)
 */
export const getAllSubscriptions = async (): Promise<UserSubscription[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return (data || []).map(mapSubscriptionRow);
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    return [];
  }
};

// ============================================
// STRIPE CHECKOUT
// ============================================

/**
 * Create a Stripe checkout session
 */
export const createCheckoutSession = async (
  interval: BillingInterval
): Promise<{ url: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { interval },
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return null;
  }
};

/**
 * Sync subscription from Stripe (fallback for webhook failures)
 */
export const syncSubscription = async (): Promise<{
  synced: boolean;
  tier?: string;
  status?: string;
  message?: string;
} | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('sync-subscription', {
      body: {},
    });

    if (error) {
      console.error('Error syncing subscription:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error syncing subscription:', err);
    return null;
  }
};

/**
 * Create a Stripe customer portal session
 * Returns { url } on success, { error, message } on expected errors, or null on unexpected errors
 */
export const createPortalSession = async (): Promise<{ url: string } | { error: string; message: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('create-portal', {
      body: {},
    });

    if (error) {
      console.error('Error creating portal session:', error);
      // Try to parse the error response for structured errors
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          if (errorBody.error === 'no_subscription') {
            return { error: 'no_subscription', message: errorBody.message };
          }
        } catch {
          // Ignore parse errors
        }
      }
      return null;
    }

    // Check if data contains an error (for non-throw errors)
    if (data?.error) {
      return { error: data.error, message: data.message || 'An error occurred' };
    }

    return data;
  } catch (err) {
    console.error('Error creating portal session:', err);
    return null;
  }
};

// ============================================
// PAUSE/CANCEL SUBSCRIPTION
// ============================================

/**
 * Pause subscription until a specified date
 */
export const pauseSubscription = async (resumeDate: string): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data, error } = await supabase.functions.invoke('pause-subscription', {
      body: { action: 'pause', resumeDate },
    });

    if (error) {
      console.error('Error pausing subscription:', error);
      return { success: false, message: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error pausing subscription:', err);
    return { success: false, message: 'Failed to pause subscription' };
  }
};

/**
 * Resume a paused subscription
 */
export const resumeSubscription = async (): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data, error } = await supabase.functions.invoke('pause-subscription', {
      body: { action: 'resume' },
    });

    if (error) {
      console.error('Error resuming subscription:', error);
      return { success: false, message: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error resuming subscription:', err);
    return { success: false, message: 'Failed to resume subscription' };
  }
};

/**
 * Get the cancel offer details
 */
export const getCancelOffer = async (): Promise<{
  offerAvailable: boolean;
  discountPercent?: number;
  durationMonths?: number;
  message?: string;
} | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { action: 'get-offer' },
    });

    if (error) {
      console.error('Error getting cancel offer:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error getting cancel offer:', err);
    return null;
  }
};

/**
 * Accept the cancel offer discount
 */
export const acceptCancelOffer = async (): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { action: 'accept-offer' },
    });

    if (error) {
      console.error('Error accepting cancel offer:', error);
      return { success: false, message: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error accepting cancel offer:', err);
    return { success: false, message: 'Failed to accept offer' };
  }
};

/**
 * Cancel subscription at end of period
 */
export const cancelSubscription = async (reason?: string): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
      body: { action: 'cancel', reason },
    });

    if (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, message: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    return { success: false, message: 'Failed to cancel subscription' };
  }
};

/**
 * Cancel trial (ends trial immediately, reverts to free tier)
 */
export const cancelTrial = async (reason?: string): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    // Update subscription to free tier
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier: 'free',
        status: 'active',
        trial_started_at: null,
        trial_ends_at: null,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error cancelling trial:', error);
      return { success: false, message: error.message };
    }

    console.log(`User ${user.id} cancelled trial. Reason: ${reason || 'Not provided'}`);
    return { success: true, message: 'Trial cancelled. You are now on the free plan.' };
  } catch (err) {
    console.error('Error cancelling trial:', err);
    return { success: false, message: 'Failed to cancel trial' };
  }
};

/**
 * Reset subscription to free tier (for testing/fixing issues)
 */
export const resetToFreeTier = async (): Promise<{ success: boolean; message?: string }> => {
  if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    // Reset all subscription fields to free tier defaults
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        tier: 'free',
        status: 'active',
        trial_started_at: null,
        trial_ends_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_current_period_end: null,
        cancel_at_period_end: false,
        admin_granted_pro: false,
        admin_granted_by: null,
        admin_grant_expires_at: null,
        admin_grant_note: null,
        paused_at: null,
        pause_resumes_at: null,
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error resetting to free tier:', error);
      return { success: false, message: error.message };
    }

    console.log(`User ${user.id} reset to free tier`);
    return { success: true, message: 'Subscription reset to free tier. You can now upgrade through Stripe.' };
  } catch (err) {
    console.error('Error resetting to free tier:', err);
    return { success: false, message: 'Failed to reset subscription' };
  }
};

// ============================================
// HELPERS
// ============================================

function mapConfigRow(row: any): SubscriptionConfig {
  return {
    trialPeriodDays: row.trial_period_days || 7,
    priceWeeklyCents: row.price_weekly_cents || 299,
    priceMonthlyCents: row.price_monthly_cents || 999,
    priceYearlyCents: row.price_yearly_cents || 7999,
    yearlyDiscountPercent: row.yearly_discount_percent || 33,
    freeRecipeLimit: row.free_recipe_limit || 20,
    proFeatures: row.pro_features || [],
    stripeWeeklyPriceId: row.stripe_weekly_price_id,
    stripeMonthlyPriceId: row.stripe_monthly_price_id,
    stripeYearlyPriceId: row.stripe_yearly_price_id,
    cancelOfferEnabled: row.cancel_offer_enabled ?? true,
    cancelOfferDiscountPercent: row.cancel_offer_discount_percent || 50,
    cancelOfferDurationMonths: row.cancel_offer_duration_months || 3,
    cancelOfferMessage: row.cancel_offer_message || 'Before you go, we\'d like to offer you a special discount!',
  };
}

function mapSubscriptionRow(row: any): UserSubscription {
  return {
    userId: row.user_id,
    tier: row.tier || 'free',
    status: row.status || 'active',
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    stripeCurrentPeriodEnd: row.stripe_current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end || false,
    adminGrantedPro: row.admin_granted_pro || false,
    adminGrantedBy: row.admin_granted_by,
    adminGrantExpiresAt: row.admin_grant_expires_at,
    adminGrantNote: row.admin_grant_note,
    pausedAt: row.paused_at,
    pauseResumesAt: row.pause_resumes_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Check Pro status from subscription object (sync version)
 */
function checkHasProFromSubscription(subscription: UserSubscription): boolean {
  // Check admin grant
  if (subscription.adminGrantedPro) {
    if (!subscription.adminGrantExpiresAt || new Date(subscription.adminGrantExpiresAt) > new Date()) {
      return true;
    }
  }

  // Check Pro tier with valid status
  if (subscription.tier === 'pro') {
    if (subscription.status === 'active') {
      if (subscription.stripeCurrentPeriodEnd) {
        return new Date(subscription.stripeCurrentPeriodEnd) > new Date();
      }
      return true;
    }
    if (subscription.status === 'trialing' && subscription.trialEndsAt) {
      return new Date(subscription.trialEndsAt) > new Date();
    }
  }

  return false;
}

/**
 * Format price in cents to display string
 */
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

/**
 * Get price per interval with display text
 */
export const getPriceDisplay = (config: SubscriptionConfig, interval: BillingInterval): {
  price: string;
  perPeriod: string;
  savings?: string;
} => {
  switch (interval) {
    case 'weekly':
      return {
        price: formatPrice(config.priceWeeklyCents),
        perPeriod: '/week'
      };
    case 'monthly':
      return {
        price: formatPrice(config.priceMonthlyCents),
        perPeriod: '/month'
      };
    case 'yearly':
      return {
        price: formatPrice(config.priceYearlyCents),
        perPeriod: '/year',
        savings: `Save ${config.yearlyDiscountPercent}%`
      };
  }
};
