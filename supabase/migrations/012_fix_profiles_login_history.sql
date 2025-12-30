-- Migration 012: Fix Profiles Table & Add Login History
-- Fixes critical bug where users don't appear in admin list due to missing columns

-- ============================================
-- FIX PROFILES TABLE
-- ============================================

-- Add all required columns to profiles table (IF NOT EXISTS for safety)
-- Note: Some columns may already exist from initial schema
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Populate email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Copy display_name to full_name for existing profiles (only if display_name has value)
-- Using DO block to handle case where display_name might not have data
DO $$
BEGIN
    UPDATE public.profiles
    SET full_name = display_name
    WHERE full_name IS NULL AND display_name IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if columns don't exist or have issues
    NULL;
END $$;

-- Update the handle_new_user trigger to include email and full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, full_name, avatar_url, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Add RLS policy for admins to update all profiles (for setting admin status)
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- ============================================
-- LOGIN HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    login_method TEXT, -- 'email', 'google', 'apple'
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own login history
CREATE POLICY "Users view own login history" ON public.login_history
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins view all login history" ON public.login_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Service role can insert login history (for Edge Function)
-- Note: Using permissive insert policy - the Edge Function uses service role key
CREATE POLICY "Service can insert login history" ON public.login_history
    FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON public.login_history(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_date ON public.login_history(user_id, login_at DESC);

-- ============================================
-- HELPER FUNCTION FOR LOGIN SUMMARY
-- ============================================

-- Function to get login summary for a user
CREATE OR REPLACE FUNCTION get_user_login_summary(target_user_id UUID)
RETURNS TABLE (
    total_logins BIGINT,
    last_login_at TIMESTAMPTZ,
    last_login_city TEXT,
    last_login_country TEXT,
    unique_devices BIGINT,
    unique_countries BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_logins,
        MAX(lh.login_at) as last_login_at,
        (SELECT lh2.city FROM public.login_history lh2 WHERE lh2.user_id = target_user_id ORDER BY lh2.login_at DESC LIMIT 1) as last_login_city,
        (SELECT lh2.country FROM public.login_history lh2 WHERE lh2.user_id = target_user_id ORDER BY lh2.login_at DESC LIMIT 1) as last_login_country,
        COUNT(DISTINCT lh.device_type)::BIGINT as unique_devices,
        COUNT(DISTINCT lh.country)::BIGINT as unique_countries
    FROM public.login_history lh
    WHERE lh.user_id = target_user_id AND lh.success = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
