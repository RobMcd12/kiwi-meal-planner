-- Migration 013: Subscription System
-- Implements paid subscription tiers with Stripe integration

-- ============================================
-- SUBSCRIPTION CONFIGURATION (Admin Settings)
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscription_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_period_days INTEGER DEFAULT 7,
    price_weekly_cents INTEGER DEFAULT 299,
    price_monthly_cents INTEGER DEFAULT 999,
    price_yearly_cents INTEGER DEFAULT 7999,
    yearly_discount_percent INTEGER DEFAULT 33,
    free_recipe_limit INTEGER DEFAULT 20,
    pro_features JSONB DEFAULT '["pantry_scanner","video_scanner","live_dictation","audio_recorder","unlimited_recipes"]',
    stripe_weekly_price_id TEXT,
    stripe_monthly_price_id TEXT,
    stripe_yearly_price_id TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration (singleton row)
INSERT INTO public.subscription_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT CHECK (tier IN ('free', 'pro')) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')) DEFAULT 'active',
    -- Trial period
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    -- Stripe integration
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    stripe_current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    -- Admin override (stacks with Stripe subscription)
    admin_granted_pro BOOLEAN DEFAULT FALSE,
    admin_granted_by UUID REFERENCES auth.users(id),
    admin_grant_expires_at TIMESTAMPTZ,
    admin_grant_note TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTO-CREATE SUBSCRIPTION ON USER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
DECLARE
    trial_days INTEGER;
BEGIN
    -- Get trial period from config
    SELECT trial_period_days INTO trial_days
    FROM public.subscription_config
    LIMIT 1;

    -- Create subscription with trial
    INSERT INTO public.user_subscriptions (
        user_id,
        tier,
        status,
        trial_started_at,
        trial_ends_at
    )
    VALUES (
        NEW.id,
        'pro',
        'trialing',
        NOW(),
        NOW() + (COALESCE(trial_days, 7) || ' days')::INTERVAL
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

-- Create trigger for new user subscriptions
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_subscription();

-- ============================================
-- AUTO-UPDATE TIMESTAMP
-- ============================================

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_config_updated_at
    BEFORE UPDATE ON public.subscription_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.subscription_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Config: Anyone can read, admins can update
CREATE POLICY "Anyone can read subscription config" ON public.subscription_config
    FOR SELECT USING (true);

CREATE POLICY "Admins can update subscription config" ON public.subscription_config
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- User subscriptions: Users see own, admins see all
CREATE POLICY "Users view own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all subscriptions" ON public.user_subscriptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins update subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Service role can insert/update (for Edge Functions)
CREATE POLICY "Service can manage subscriptions" ON public.user_subscriptions
    FOR ALL USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.user_subscriptions(tier);

-- ============================================
-- HELPER FUNCTION: Check if user has Pro access
-- ============================================

CREATE OR REPLACE FUNCTION check_user_has_pro(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub RECORD;
BEGIN
    SELECT * INTO sub
    FROM public.user_subscriptions
    WHERE user_id = target_user_id;

    -- No subscription record
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Admin granted Pro (check expiry)
    IF sub.admin_granted_pro THEN
        IF sub.admin_grant_expires_at IS NULL OR sub.admin_grant_expires_at > NOW() THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Active Pro subscription
    IF sub.tier = 'pro' AND sub.status IN ('active', 'trialing') THEN
        -- Check if trial has expired
        IF sub.status = 'trialing' AND sub.trial_ends_at < NOW() THEN
            RETURN FALSE;
        END IF;
        -- Check if Stripe subscription has expired
        IF sub.stripe_current_period_end IS NOT NULL AND sub.stripe_current_period_end < NOW() THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get user's active recipe count
-- ============================================

CREATE OR REPLACE FUNCTION get_user_recipe_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    recipe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recipe_count
    FROM public.favorite_meals
    WHERE user_id = target_user_id;

    RETURN COALESCE(recipe_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if user can create recipe
-- ============================================

CREATE OR REPLACE FUNCTION check_can_create_recipe(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_pro BOOLEAN;
    recipe_count INTEGER;
    recipe_limit INTEGER;
BEGIN
    -- Check if user has Pro
    has_pro := check_user_has_pro(target_user_id);

    IF has_pro THEN
        RETURN TRUE;
    END IF;

    -- Get recipe count and limit
    recipe_count := get_user_recipe_count(target_user_id);
    SELECT free_recipe_limit INTO recipe_limit FROM public.subscription_config LIMIT 1;

    RETURN recipe_count < COALESCE(recipe_limit, 20);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE SUBSCRIPTIONS FOR EXISTING USERS
-- ============================================

-- Insert subscriptions for users who don't have one yet
INSERT INTO public.user_subscriptions (user_id, tier, status)
SELECT id, 'free', 'active'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;
