-- Migration: User Recipe Categories
-- Allows users to create their own custom categories and assign recipes to them

-- ============================================
-- 1. USER RECIPE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'slate', -- Tailwind color name for UI
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name) -- Each user can only have one category with a given name
);

-- Enable RLS
ALTER TABLE public.user_recipe_categories ENABLE ROW LEVEL SECURITY;

-- Users can manage their own categories
CREATE POLICY "Users can view own categories" ON public.user_recipe_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.user_recipe_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.user_recipe_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.user_recipe_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_recipe_categories_user_id ON public.user_recipe_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_categories_name ON public.user_recipe_categories(name);

-- Trigger to update updated_at
CREATE TRIGGER user_recipe_categories_updated_at
  BEFORE UPDATE ON public.user_recipe_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. RECIPE CATEGORY ASSIGNMENTS (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recipe_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.user_recipe_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, category_id) -- Each recipe can only be in a category once
);

-- Enable RLS
ALTER TABLE public.recipe_category_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for their own recipes
CREATE POLICY "Users can view own recipe category assignments" ON public.recipe_category_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    )
  );

-- Users can manage assignments for their own recipes
CREATE POLICY "Users can insert own recipe category assignments" ON public.recipe_category_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.user_recipe_categories
      WHERE id = category_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipe category assignments" ON public.recipe_category_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_category_assignments_meal_id ON public.recipe_category_assignments(meal_id);
CREATE INDEX IF NOT EXISTS idx_recipe_category_assignments_category_id ON public.recipe_category_assignments(category_id);
