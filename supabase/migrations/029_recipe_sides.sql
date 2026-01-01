-- Migration: Add sides column to favorite_meals for side dish storage
-- This allows users to save AI-suggested side dishes to their recipes

-- Add sides column as JSONB to store array of side dish objects
ALTER TABLE public.favorite_meals
ADD COLUMN IF NOT EXISTS sides JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.favorite_meals.sides IS 'JSON array of side dishes: [{id, name, description, ingredients, instructions, prepTime, servings}]';

-- Create index for recipes with sides (for filtering)
CREATE INDEX IF NOT EXISTS idx_favorite_meals_has_sides
ON public.favorite_meals ((sides IS NOT NULL));
