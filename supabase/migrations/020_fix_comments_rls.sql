-- Migration 020: Fix Comments RLS and Add Public/Private Toggle
-- Allows users to comment on their own recipes (not just public ones)
-- Adds is_public column to comments so users can choose visibility

-- Add is_public column to comments (default true for backwards compatibility)
ALTER TABLE public.recipe_comments
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Drop ALL existing SELECT/INSERT policies on recipe_comments to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view comments on public recipes" ON public.recipe_comments;
DROP POLICY IF EXISTS "Users can comment on public recipes" ON public.recipe_comments;
DROP POLICY IF EXISTS "View comments on public recipes" ON public.recipe_comments;
DROP POLICY IF EXISTS "Insert comments on public recipes" ON public.recipe_comments;
DROP POLICY IF EXISTS "View comments" ON public.recipe_comments;
DROP POLICY IF EXISTS "Insert comments" ON public.recipe_comments;

-- New policy: Users can view comments if:
-- 1. The comment is public AND the recipe is public, OR
-- 2. The comment is on their own recipe, OR
-- 3. It's their own comment
CREATE POLICY "View comments" ON public.recipe_comments
  FOR SELECT USING (
    -- Public comments on public recipes
    (is_public = true AND EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND is_public = true
    ))
    OR
    -- Own recipe's comments (can see all including private)
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    )
    OR
    -- Own comments
    user_id = auth.uid()
  );

-- New policy: Users can insert comments if:
-- 1. The recipe is public, OR
-- 2. It's their own recipe
CREATE POLICY "Insert comments" ON public.recipe_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      -- Public recipe
      EXISTS (
        SELECT 1 FROM public.favorite_meals
        WHERE id = meal_id AND is_public = true
      )
      OR
      -- Own recipe
      EXISTS (
        SELECT 1 FROM public.favorite_meals
        WHERE id = meal_id AND user_id = auth.uid()
      )
    )
  );

-- Add comment
COMMENT ON COLUMN public.recipe_comments.is_public IS 'Whether the comment is visible to others viewing the recipe';
