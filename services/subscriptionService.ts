import { supabase, isSupabaseConfigured } from './authService';
import type {
  SubscriptionConfig,
  UserSubscription,
  SubscriptionState,
  ProFeature,
  BillingInterval,
  AdminSubscriptionGrant
} from '../types';

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
  const [subscription, config, recipeCount] = await Promise.all([
    getUserSubscription(userId),
    getSubscriptionConfig(),
    getRecipeCount(userId)
  ]);

  const hasPro = subscription ? await checkHasProFromSubscription(subscription) : false;
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
 * Create a Stripe customer portal session
 */
export const createPortalSession = async (): Promise<{ url: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('create-portal', {
      body: {},
    });

    if (error) {
      console.error('Error creating portal session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating portal session:', err);
    return null;
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
