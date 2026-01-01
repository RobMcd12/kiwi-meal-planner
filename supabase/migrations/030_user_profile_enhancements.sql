-- Migration: Add profile enhancements for name editing, country, and ingredient exclusions
-- This allows users to:
-- 1. Edit their display name
-- 2. Select their country for localized ingredient names (cilantro/coriander)
-- 3. Add ingredients to always exclude (allergies, dislikes)

-- Add country to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;

-- Add ingredient exclusions to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS excluded_ingredients JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.country IS 'User country code (e.g., US, UK, AU, NZ) for ingredient localization';
COMMENT ON COLUMN public.user_preferences.excluded_ingredients IS 'JSON array of ingredients to always exclude: [{name, reason}]';

-- Create index for country-based queries (if needed for analytics)
CREATE INDEX IF NOT EXISTS idx_profiles_country
ON public.profiles (country) WHERE country IS NOT NULL;
