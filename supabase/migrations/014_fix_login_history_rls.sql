-- Migration 014: Fix Login History RLS Policies
-- Ensures admins can view all login history and users can insert their own

-- ============================================
-- VERIFY LOGIN_HISTORY TABLE EXISTS
-- ============================================

-- Create table if it doesn't exist (safe to re-run)
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    region TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    login_method TEXT,
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users view own login history" ON public.login_history;
DROP POLICY IF EXISTS "Admins view all login history" ON public.login_history;
DROP POLICY IF EXISTS "Service can insert login history" ON public.login_history;
DROP POLICY IF EXISTS "Users can insert own login history" ON public.login_history;
DROP POLICY IF EXISTS "Anyone can insert login history" ON public.login_history;

-- ============================================
-- CREATE FIXED RLS POLICIES
-- ============================================

-- Policy 1: Users can view their own login history
CREATE POLICY "Users view own login history" ON public.login_history
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Admins can view ALL login history (uses is_admin_user function)
CREATE POLICY "Admins view all login history" ON public.login_history
    FOR SELECT USING (
        public.is_admin_user(auth.uid())
    );

-- Policy 3: Users can insert their own login history
CREATE POLICY "Users can insert own login history" ON public.login_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Service role bypass (for Edge Functions)
-- Note: Service role already bypasses RLS, but this is explicit
CREATE POLICY "Service can insert login history" ON public.login_history
    FOR INSERT WITH CHECK (true);

-- ============================================
-- CREATE INDEXES (IF NOT EXIST)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON public.login_history(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_date ON public.login_history(user_id, login_at DESC);

-- ============================================
-- VERIFY is_admin_user FUNCTION EXISTS
-- ============================================

-- This should already exist from migration 012, but recreate if not
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_is_admin BOOLEAN;
BEGIN
    -- Get user email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;

    -- Super admin always has access
    IF user_email = 'rob@unicloud.co.nz' THEN
        RETURN TRUE;
    END IF;

    -- Check is_admin flag in profiles (direct query, bypasses RLS due to SECURITY DEFINER)
    SELECT is_admin INTO user_is_admin FROM public.profiles WHERE id = user_id;

    RETURN COALESCE(user_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DEBUG: Check current state
-- ============================================

-- Run these queries manually in Supabase SQL Editor to debug:
--
-- Check if login_history has any records:
-- SELECT COUNT(*) FROM public.login_history;
--
-- Check RLS policies on login_history:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'login_history';
--
-- Test is_admin_user function:
-- SELECT public.is_admin_user(auth.uid());
