-- Migration 015: Add Pause/Cancel Subscription Features
-- Adds ability to pause subscriptions and configurable cancel offer

-- ============================================
-- ADD PAUSE FIELDS TO USER SUBSCRIPTIONS
-- ============================================

ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_resumes_at TIMESTAMPTZ;

-- ============================================
-- ADD CANCEL OFFER CONFIG
-- ============================================

ALTER TABLE public.subscription_config
ADD COLUMN IF NOT EXISTS cancel_offer_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS cancel_offer_discount_percent INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cancel_offer_duration_months INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS cancel_offer_message TEXT DEFAULT 'Before you go, we''d like to offer you a special discount!';

-- ============================================
-- INDEX FOR PAUSED SUBSCRIPTIONS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_paused ON public.user_subscriptions(paused_at) WHERE paused_at IS NOT NULL;
