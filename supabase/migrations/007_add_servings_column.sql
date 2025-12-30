-- Migration: Add servings column to favorite_meals
-- This stores how many servings the recipe makes (for accurate nutrition calculation)

ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 4;

-- Add comment explaining the column
COMMENT ON COLUMN public.favorite_meals.servings IS 'Number of servings the recipe makes (for nutrition calculation)';
