-- Migration 024: Fix Recipe Videos INSERT Policy
-- The issue is that during INSERT, there's no existing row so the check needs
-- to verify the user is an admin from the profiles table

-- ============================================
-- 1. DROP ALL EXISTING POLICIES ON recipe_videos
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'recipe_videos' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.recipe_videos', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- 2. CREATE SIMPLE, WORKING POLICIES
-- ============================================

-- SELECT: Anyone can view videos
CREATE POLICY "recipe_videos_select_policy" ON public.recipe_videos
    FOR SELECT
    USING (true);

-- INSERT: Only admins can insert (check profile table for is_admin)
CREATE POLICY "recipe_videos_insert_policy" ON public.recipe_videos
    FOR INSERT
    WITH CHECK (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- UPDATE: Only admins can update
CREATE POLICY "recipe_videos_update_policy" ON public.recipe_videos
    FOR UPDATE
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- DELETE: Only admins can delete
CREATE POLICY "recipe_videos_delete_policy" ON public.recipe_videos
    FOR DELETE
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- ============================================
-- 3. VERIFY RLS IS ENABLED
-- ============================================
ALTER TABLE public.recipe_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. GRANT ACCESS
-- ============================================
GRANT ALL ON public.recipe_videos TO authenticated;
GRANT SELECT ON public.recipe_videos TO anon;

-- ============================================
-- 5. ALSO FIX admin_google_drive_config
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'admin_google_drive_config' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_google_drive_config', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Only admins
CREATE POLICY "admin_drive_config_select" ON public.admin_google_drive_config
    FOR SELECT
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- UPDATE: Only admins
CREATE POLICY "admin_drive_config_update" ON public.admin_google_drive_config
    FOR UPDATE
    USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

-- INSERT: Only admins
CREATE POLICY "admin_drive_config_insert" ON public.admin_google_drive_config
    FOR INSERT
    WITH CHECK (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    );

ALTER TABLE public.admin_google_drive_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_google_drive_config TO authenticated;
