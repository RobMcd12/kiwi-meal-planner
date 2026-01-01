-- Migration 022: Admin View All Recipes
-- Allow admins to view all recipes and meal plans for admin dashboard

-- ============================================
-- 1. ADMIN POLICY FOR FAVORITE_MEALS (RECIPES)
-- ============================================

-- Drop existing select policy first (to recreate it with admin access)
DROP POLICY IF EXISTS "Users can view own and public recipes" ON public.favorite_meals;

-- Create new policy that includes admin access
CREATE POLICY "Users can view own and public recipes or admin can view all" ON public.favorite_meals
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 2. ADMIN POLICY FOR SAVED_MEAL_PLANS
-- ============================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view own saved plans" ON public.saved_meal_plans;

-- Create new policy that includes admin access
CREATE POLICY "Users can view own saved plans or admin can view all" ON public.saved_meal_plans
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================
-- 3. COMMENTS
-- ============================================
COMMENT ON POLICY "Users can view own and public recipes or admin can view all" ON public.favorite_meals
  IS 'Users see own + public recipes, admins see all';
COMMENT ON POLICY "Users can view own saved plans or admin can view all" ON public.saved_meal_plans
  IS 'Users see own plans, admins see all';
