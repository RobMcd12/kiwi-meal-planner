-- Migration 039: Feedback RLS Policies
-- Ensure proper RLS policies exist for feedback table

-- ============================================
-- 1. ENABLE RLS ON FEEDBACK TABLE
-- ============================================

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================

DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can update all feedback" ON public.feedback;

-- ============================================
-- 3. CREATE USER POLICIES
-- ============================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (for marking as viewed)
CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 4. CREATE ADMIN POLICIES
-- ============================================

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (public.is_admin_user(auth.uid()));

-- Admins can update all feedback (for responding)
CREATE POLICY "Admins can update all feedback" ON public.feedback
  FOR UPDATE USING (public.is_admin_user(auth.uid()));
