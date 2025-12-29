-- ============================================
-- Migration: 006_consolidated_updates
-- Description: All database updates for new features:
--   1. Saved Meal Plans table
--   2. Feedback screenshot column
-- ============================================

-- ============================================
-- 1. SAVED MEAL PLANS TABLE
-- ============================================

-- Create saved_meal_plans table for saving full meal plans with shopping lists
CREATE TABLE IF NOT EXISTS public.saved_meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_plan JSONB NOT NULL,
  shopping_list JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_meal_plans_user_id ON public.saved_meal_plans(user_id);

-- Enable RLS
ALTER TABLE public.saved_meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_meal_plans
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own saved plans" ON public.saved_meal_plans;
  DROP POLICY IF EXISTS "Users can insert own saved plans" ON public.saved_meal_plans;
  DROP POLICY IF EXISTS "Users can update own saved plans" ON public.saved_meal_plans;
  DROP POLICY IF EXISTS "Users can delete own saved plans" ON public.saved_meal_plans;
END $$;

CREATE POLICY "Users can view own saved plans"
  ON public.saved_meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved plans"
  ON public.saved_meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved plans"
  ON public.saved_meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved plans"
  ON public.saved_meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at (only create if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS set_saved_meal_plans_updated_at ON public.saved_meal_plans;
    CREATE TRIGGER set_saved_meal_plans_updated_at
      BEFORE UPDATE ON public.saved_meal_plans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 2. FEEDBACK SCREENSHOT COLUMN
-- ============================================

-- Add screenshot column to feedback table (stores base64 encoded image)
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS screenshot TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.feedback.screenshot IS 'Base64 encoded screenshot image for visual context when reporting bugs or issues';

-- ============================================
-- 3. HELPER FUNCTION (if not exists)
-- ============================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
