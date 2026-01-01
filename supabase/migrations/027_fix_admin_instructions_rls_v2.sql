-- Migration 027: Fix RLS policies for admin_instructions using SECURITY DEFINER function
-- The issue is that checking profiles table from within RLS policy may have RLS issues

-- ============================================
-- 1. CREATE OR REPLACE THE is_admin FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES ON admin_instructions
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_instructions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_instructions', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- 3. CREATE NEW POLICIES USING THE FUNCTION
-- ============================================
CREATE POLICY "instructions_select" ON public.admin_instructions
    FOR SELECT USING (true);

CREATE POLICY "instructions_insert" ON public.admin_instructions
    FOR INSERT WITH CHECK (public.is_current_user_admin());

CREATE POLICY "instructions_update" ON public.admin_instructions
    FOR UPDATE USING (public.is_current_user_admin());

CREATE POLICY "instructions_delete" ON public.admin_instructions
    FOR DELETE USING (public.is_current_user_admin());

-- ============================================
-- 4. DROP ALL EXISTING POLICIES ON admin_instruction_categories
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_instruction_categories' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_instruction_categories', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- 5. CREATE NEW POLICIES FOR CATEGORIES
-- ============================================
CREATE POLICY "categories_select" ON public.admin_instruction_categories
    FOR SELECT USING (true);

CREATE POLICY "categories_insert" ON public.admin_instruction_categories
    FOR INSERT WITH CHECK (public.is_current_user_admin());

CREATE POLICY "categories_update" ON public.admin_instruction_categories
    FOR UPDATE USING (public.is_current_user_admin());

CREATE POLICY "categories_delete" ON public.admin_instruction_categories
    FOR DELETE USING (public.is_current_user_admin());

-- ============================================
-- 6. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.admin_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_instruction_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT SELECT ON public.admin_instructions TO anon;
GRANT ALL ON public.admin_instructions TO authenticated;
GRANT SELECT ON public.admin_instruction_categories TO anon;
GRANT ALL ON public.admin_instruction_categories TO authenticated;
