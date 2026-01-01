-- Migration 023: Fix Recipe Videos RLS Policies
-- The is_admin check needs to work properly for INSERT operations

-- ============================================
-- 1. CREATE HELPER FUNCTION FOR ADMIN CHECK
-- ============================================
-- Using SECURITY DEFINER to ensure the function can read profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. DROP AND RECREATE RECIPE_VIDEOS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins can update recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins can delete recipe videos" ON public.recipe_videos;

-- Recreate with simpler function call
CREATE POLICY "Admins can insert recipe videos" ON public.recipe_videos
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update recipe videos" ON public.recipe_videos
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete recipe videos" ON public.recipe_videos
    FOR DELETE USING (public.is_admin());

-- ============================================
-- 3. FIX ADMIN GOOGLE DRIVE CONFIG POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view drive config" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "Admins can update drive config" ON public.admin_google_drive_config;

-- Recreate with function call
CREATE POLICY "Admins can view drive config" ON public.admin_google_drive_config
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update drive config" ON public.admin_google_drive_config
    FOR UPDATE USING (public.is_admin());

-- Also add INSERT policy for initial setup
CREATE POLICY "Admins can insert drive config" ON public.admin_google_drive_config
    FOR INSERT WITH CHECK (public.is_admin());

-- ============================================
-- 4. COMMENTS
-- ============================================
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is an admin';
