-- Migration 019: Pantry Categories
-- Allows users to organize pantry items into collapsible, orderable categories

-- Create pantry categories table
CREATE TABLE IF NOT EXISTS public.pantry_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT TRUE,
    is_staple_category BOOLEAN DEFAULT FALSE, -- If true, this category is for staples
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name, is_staple_category)
);

-- Enable RLS
ALTER TABLE public.pantry_categories ENABLE ROW LEVEL SECURITY;

-- Users can manage their own categories
CREATE POLICY "Users can view own categories" ON public.pantry_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON public.pantry_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON public.pantry_categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON public.pantry_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Add category reference and sort order to pantry_items
ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.pantry_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pantry_categories_user ON public.pantry_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_categories_sort ON public.pantry_categories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pantry_items_category ON public.pantry_items(category_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_sort ON public.pantry_items(user_id, category_id, sort_order);

-- Add comments
COMMENT ON TABLE public.pantry_categories IS 'User-defined categories for organizing pantry items';
COMMENT ON COLUMN public.pantry_categories.is_collapsed IS 'Whether the category is collapsed in the UI';
COMMENT ON COLUMN public.pantry_categories.is_staple_category IS 'If true, this is a category for staple items';
COMMENT ON COLUMN public.pantry_items.category_id IS 'Optional category this item belongs to';
COMMENT ON COLUMN public.pantry_items.sort_order IS 'Sort order within category (or uncategorized)';
