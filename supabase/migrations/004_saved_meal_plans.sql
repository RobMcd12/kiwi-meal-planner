-- ============================================
-- Migration: 004_saved_meal_plans
-- Description: Add saved meal plans table for users to save full plans with shopping lists
-- ============================================

-- Create saved_meal_plans table
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

-- RLS Policies
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

-- Trigger for updated_at
CREATE TRIGGER set_saved_meal_plans_updated_at
  BEFORE UPDATE ON public.saved_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
