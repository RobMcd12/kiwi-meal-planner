-- Migration 026: Fix RLS policies for admin_instructions and admin_instruction_categories
-- The FOR ALL policy needs both USING (for SELECT/UPDATE/DELETE) and WITH CHECK (for INSERT/UPDATE)

-- ============================================
-- 1. FIX ADMIN_INSTRUCTIONS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage instructions" ON public.admin_instructions;
DROP POLICY IF EXISTS "Authenticated users can read active instructions" ON public.admin_instructions;

-- Create separate policies for each operation
CREATE POLICY "admin_instructions_select_all" ON public.admin_instructions
    FOR SELECT
    USING (true);  -- Anyone can read (app handles visibility)

CREATE POLICY "admin_instructions_insert" ON public.admin_instructions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "admin_instructions_update" ON public.admin_instructions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "admin_instructions_delete" ON public.admin_instructions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 2. FIX ADMIN_INSTRUCTION_CATEGORIES POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage instruction categories" ON public.admin_instruction_categories;
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.admin_instruction_categories;

-- Create separate policies for each operation
CREATE POLICY "categories_select_all" ON public.admin_instruction_categories
    FOR SELECT
    USING (true);  -- Anyone can read categories

CREATE POLICY "categories_insert" ON public.admin_instruction_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "categories_update" ON public.admin_instruction_categories
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "categories_delete" ON public.admin_instruction_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.admin_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_instruction_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.admin_instructions TO anon;
GRANT ALL ON public.admin_instructions TO authenticated;
GRANT SELECT ON public.admin_instruction_categories TO anon;
GRANT ALL ON public.admin_instruction_categories TO authenticated;
