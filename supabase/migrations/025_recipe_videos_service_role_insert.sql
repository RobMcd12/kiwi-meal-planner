-- Migration 025: Allow service role to bypass RLS for recipe_videos
-- Instead of fixing RLS policies, we'll use an Edge Function with service role
-- to handle the INSERT. This is more reliable for authenticated admin operations.

-- ============================================
-- 1. DROP ALL KNOWN POLICIES ON recipe_videos
-- ============================================

-- From migration 021
DROP POLICY IF EXISTS "Anyone can view recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins can insert recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins can update recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins can delete recipe videos" ON public.recipe_videos;

-- From migration 023
DROP POLICY IF EXISTS "Admins insert recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins update recipe videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "Admins delete recipe videos" ON public.recipe_videos;

-- From migration 024
DROP POLICY IF EXISTS "recipe_videos_select_policy" ON public.recipe_videos;
DROP POLICY IF EXISTS "recipe_videos_insert_policy" ON public.recipe_videos;
DROP POLICY IF EXISTS "recipe_videos_update_policy" ON public.recipe_videos;
DROP POLICY IF EXISTS "recipe_videos_delete_policy" ON public.recipe_videos;

-- Any other potential policy names
DROP POLICY IF EXISTS "admin_insert_videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "admin_update_videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "admin_delete_videos" ON public.recipe_videos;
DROP POLICY IF EXISTS "select_videos" ON public.recipe_videos;

-- ============================================
-- 2. CREATE SIMPLE RLS POLICIES
-- ============================================

-- SELECT: Anyone can view
CREATE POLICY "videos_select_all" ON public.recipe_videos
    FOR SELECT
    USING (true);

-- INSERT: Authenticated admins can insert
-- Using a direct subquery approach that works with WITH CHECK
CREATE POLICY "videos_insert_admin" ON public.recipe_videos
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

-- UPDATE: Admins can update
CREATE POLICY "videos_update_admin" ON public.recipe_videos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

-- DELETE: Admins can delete
CREATE POLICY "videos_delete_admin" ON public.recipe_videos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.recipe_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.recipe_videos TO anon;
GRANT ALL ON public.recipe_videos TO authenticated;

-- ============================================
-- 5. DO THE SAME FOR admin_google_drive_config
-- ============================================

-- Drop all known policies
DROP POLICY IF EXISTS "Admins can view drive config" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "Admins can update drive config" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "Admins can insert drive config" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "admin_drive_config_select" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "admin_drive_config_update" ON public.admin_google_drive_config;
DROP POLICY IF EXISTS "admin_drive_config_insert" ON public.admin_google_drive_config;

-- Create new policies
CREATE POLICY "drive_config_select_admin" ON public.admin_google_drive_config
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

CREATE POLICY "drive_config_update_admin" ON public.admin_google_drive_config
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

CREATE POLICY "drive_config_insert_admin" ON public.admin_google_drive_config
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.is_admin = true
        )
    );

ALTER TABLE public.admin_google_drive_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_google_drive_config TO authenticated;

-- ============================================
-- 6. DEBUG: Output current policies (informational)
-- ============================================
COMMENT ON TABLE public.recipe_videos IS 'Recipe videos - RLS fixed in migration 025';
