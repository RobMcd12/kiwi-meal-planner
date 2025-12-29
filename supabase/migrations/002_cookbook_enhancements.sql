-- Migration: Cookbook Enhancements
-- Adds tags, notes, public sharing, and upload support

-- ============================================
-- 1. RECIPE TAGS TABLE
-- ============================================
CREATE TABLE public.recipe_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN ('cuisine', 'dietary', 'meal_type', 'other')) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;

-- Anyone can read tags
CREATE POLICY "Anyone can read tags" ON public.recipe_tags
  FOR SELECT USING (true);

-- Authenticated users can insert tags (for custom tags)
CREATE POLICY "Authenticated users can insert tags" ON public.recipe_tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Index for fast lookups
CREATE INDEX idx_recipe_tags_name ON public.recipe_tags(name);
CREATE INDEX idx_recipe_tags_category ON public.recipe_tags(category);

-- Seed default tags
INSERT INTO public.recipe_tags (name, category) VALUES
  -- Cuisine tags
  ('Italian', 'cuisine'),
  ('Asian', 'cuisine'),
  ('Mexican', 'cuisine'),
  ('Indian', 'cuisine'),
  ('Mediterranean', 'cuisine'),
  ('American', 'cuisine'),
  ('French', 'cuisine'),
  ('Thai', 'cuisine'),
  ('Japanese', 'cuisine'),
  ('Chinese', 'cuisine'),
  ('Greek', 'cuisine'),
  ('Middle Eastern', 'cuisine'),
  ('Korean', 'cuisine'),
  ('Vietnamese', 'cuisine'),
  ('Spanish', 'cuisine'),
  -- Dietary tags
  ('Vegan', 'dietary'),
  ('Vegetarian', 'dietary'),
  ('Gluten-Free', 'dietary'),
  ('Dairy-Free', 'dietary'),
  ('Keto', 'dietary'),
  ('Low-Carb', 'dietary'),
  ('Paleo', 'dietary'),
  ('Nut-Free', 'dietary'),
  ('Halal', 'dietary'),
  ('Kosher', 'dietary'),
  ('Low-Sodium', 'dietary'),
  ('Sugar-Free', 'dietary'),
  -- Meal type tags
  ('Breakfast', 'meal_type'),
  ('Lunch', 'meal_type'),
  ('Dinner', 'meal_type'),
  ('Snack', 'meal_type'),
  ('Dessert', 'meal_type'),
  ('Appetizer', 'meal_type'),
  ('Side Dish', 'meal_type'),
  ('Beverage', 'meal_type'),
  -- Other tags
  ('Quick', 'other'),
  ('Easy', 'other'),
  ('Budget-Friendly', 'other'),
  ('Healthy', 'other'),
  ('Comfort Food', 'other'),
  ('Spicy', 'other'),
  ('Kid-Friendly', 'other'),
  ('Meal Prep', 'other'),
  ('One-Pot', 'other'),
  ('BBQ', 'other'),
  ('Slow Cooker', 'other'),
  ('Air Fryer', 'other')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. MODIFY FAVORITE_MEALS TABLE
-- ============================================

-- Add source column (generated from AI or uploaded by user)
ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS source TEXT
  CHECK (source IN ('generated', 'uploaded'))
  DEFAULT 'generated';

-- Add is_public column for sharing
ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN
  DEFAULT FALSE;

-- Add upload_status for tracking background processing
ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS upload_status TEXT
  CHECK (upload_status IN ('pending', 'processing', 'complete', 'failed'))
  DEFAULT 'complete';

-- Add owner_name for public display
ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_favorite_meals_source ON public.favorite_meals(source);
CREATE INDEX IF NOT EXISTS idx_favorite_meals_is_public ON public.favorite_meals(is_public);
CREATE INDEX IF NOT EXISTS idx_favorite_meals_upload_status ON public.favorite_meals(upload_status);

-- Update RLS policy to allow viewing public recipes
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorite_meals;

CREATE POLICY "Users can view own and public recipes" ON public.favorite_meals
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own recipes" ON public.favorite_meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON public.favorite_meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON public.favorite_meals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. RECIPE TAG ASSIGNMENTS (Many-to-Many)
-- ============================================
CREATE TABLE public.recipe_tag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.recipe_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.recipe_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view tags for their own recipes and public recipes
CREATE POLICY "Users can view recipe tags" ON public.recipe_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND (user_id = auth.uid() OR is_public = true)
    )
  );

-- Users can manage tags for their own recipes
CREATE POLICY "Users can manage own recipe tags" ON public.recipe_tag_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own recipe tags" ON public.recipe_tag_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND user_id = auth.uid()
    )
  );

-- Admins can manage any recipe tags
CREATE POLICY "Admins can manage any recipe tags" ON public.recipe_tag_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Indexes
CREATE INDEX idx_recipe_tag_assignments_meal_id ON public.recipe_tag_assignments(meal_id);
CREATE INDEX idx_recipe_tag_assignments_tag_id ON public.recipe_tag_assignments(tag_id);

-- ============================================
-- 4. RECIPE NOTES TABLE
-- ============================================
CREATE TABLE public.recipe_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, user_id)  -- One note per user per recipe
);

-- Enable RLS
ALTER TABLE public.recipe_notes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notes
CREATE POLICY "Users can manage own notes" ON public.recipe_notes
  FOR ALL USING (auth.uid() = user_id);

-- Users can view public notes on public recipes
CREATE POLICY "Public notes on public recipes are viewable" ON public.recipe_notes
  FOR SELECT USING (
    is_public = true AND
    EXISTS (
      SELECT 1 FROM public.favorite_meals
      WHERE id = meal_id AND is_public = true
    )
  );

-- Indexes
CREATE INDEX idx_recipe_notes_meal_id ON public.recipe_notes(meal_id);
CREATE INDEX idx_recipe_notes_user_id ON public.recipe_notes(user_id);

-- Trigger to update updated_at
CREATE TRIGGER recipe_notes_updated_at
  BEFORE UPDATE ON public.recipe_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. FULL-TEXT SEARCH (Optional enhancement)
-- ============================================
-- Add search vector column for fast text search
ALTER TABLE public.favorite_meals
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_favorite_meals_search
  ON public.favorite_meals USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_favorite_meals_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.ingredients, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
DROP TRIGGER IF EXISTS favorite_meals_search_update ON public.favorite_meals;
CREATE TRIGGER favorite_meals_search_update
  BEFORE INSERT OR UPDATE ON public.favorite_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_favorite_meals_search_vector();

-- Update existing records to populate search_vector
UPDATE public.favorite_meals SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(ingredients, ' '), '')), 'C');
