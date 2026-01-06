-- Migration 037: Admin View All Data
-- Add admin RLS policies for meal_plan_history and media_uploads tables
-- so admins can view all users' data in the admin dashboard

-- ============================================
-- 1. ADMIN POLICY FOR MEAL_PLAN_HISTORY
-- ============================================

-- Drop all existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own history" ON public.meal_plan_history;
DROP POLICY IF EXISTS "Users can view own history or admin can view all" ON public.meal_plan_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.meal_plan_history;
DROP POLICY IF EXISTS "Users can update own history" ON public.meal_plan_history;
DROP POLICY IF EXISTS "Users can delete own history" ON public.meal_plan_history;

-- Create new select policy that includes admin access
CREATE POLICY "Users can view own history or admin can view all" ON public.meal_plan_history
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

-- Keep separate policies for insert/update/delete (users only manage their own)
CREATE POLICY "Users can insert own history" ON public.meal_plan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history" ON public.meal_plan_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" ON public.meal_plan_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. ADMIN POLICY FOR MEDIA_UPLOADS
-- ============================================

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own media uploads" ON public.media_uploads;
DROP POLICY IF EXISTS "Users can view own media uploads or admin can view all" ON public.media_uploads;

-- Create new select policy that includes admin access
CREATE POLICY "Users can view own media uploads or admin can view all" ON public.media_uploads
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin_user(auth.uid())
  );

-- ============================================
-- 3. COMMENTS
-- ============================================
COMMENT ON POLICY "Users can view own history or admin can view all" ON public.meal_plan_history
  IS 'Users see own history, admins see all for dashboard stats';
COMMENT ON POLICY "Users can view own media uploads or admin can view all" ON public.media_uploads
  IS 'Users see own uploads, admins see all for dashboard stats';
