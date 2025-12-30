-- Migration: Add use_what_i_have column to meal_configs
-- This enables the "Use What I Have" mode that prioritizes pantry items

-- Add the column to meal_configs table
ALTER TABLE public.meal_configs
ADD COLUMN IF NOT EXISTS use_what_i_have BOOLEAN DEFAULT FALSE;

-- Add a comment for documentation
COMMENT ON COLUMN public.meal_configs.use_what_i_have IS
'When true, meal generation prioritizes ingredients from the user pantry to minimize shopping';
