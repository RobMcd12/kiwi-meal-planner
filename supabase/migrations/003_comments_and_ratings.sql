-- Migration: Comments and Ratings System
-- Adds public comments with star ratings for recipes

-- ============================================
-- 1. RECIPE COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.recipe_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on public recipes
CREATE POLICY "Anyone can view comments on public recipes" ON public.recipe_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND is_public = true
    )
  );

-- Users can insert comments on public recipes
CREATE POLICY "Users can comment on public recipes" ON public.recipe_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND is_public = true
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.recipe_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.recipe_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_comments_meal_id ON public.recipe_comments(meal_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_user_id ON public.recipe_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_created_at ON public.recipe_comments(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER recipe_comments_updated_at
  BEFORE UPDATE ON public.recipe_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. MODIFY RECIPE NOTES TABLE
-- ============================================
-- Remove the unique constraint to allow separate private and public notes
-- First drop the existing constraint (if exists)
ALTER TABLE public.recipe_notes DROP CONSTRAINT IF EXISTS recipe_notes_meal_id_user_id_key;

-- Add a new unique constraint that includes is_public
-- This allows each user to have one private note AND one public note per recipe
ALTER TABLE public.recipe_notes ADD CONSTRAINT recipe_notes_meal_user_public_key
  UNIQUE(meal_id, user_id, is_public);

-- ============================================
-- 3. ADD AVERAGE RATING TO RECIPES (Computed)
-- ============================================
-- Create a function to get average rating for a recipe
CREATE OR REPLACE FUNCTION get_recipe_average_rating(recipe_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM public.recipe_comments
  WHERE meal_id = recipe_id AND rating IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- Create a function to get comment count for a recipe
CREATE OR REPLACE FUNCTION get_recipe_comment_count(recipe_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::integer
  FROM public.recipe_comments
  WHERE meal_id = recipe_id;
$$ LANGUAGE SQL STABLE;
