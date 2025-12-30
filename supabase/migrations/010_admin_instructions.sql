-- Migration: Admin Instructions System
-- Allows admins to create and manage AI instructions by category with tags

-- Categories for organizing instructions
CREATE TABLE IF NOT EXISTS public.admin_instruction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instructions with tags for targeting specific features
CREATE TABLE IF NOT EXISTS public.admin_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.admin_instruction_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instruction_text TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}', -- 'meal_planner', 'recipe_generation', 'pantry_scanning'
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority = applied first
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_instruction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_instructions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage, all authenticated users can read active instructions

-- Categories: Admins can do everything
CREATE POLICY "Admins can manage instruction categories" ON public.admin_instruction_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Categories: All authenticated users can read
CREATE POLICY "Authenticated users can read categories" ON public.admin_instruction_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Instructions: Admins can do everything
CREATE POLICY "Admins can manage instructions" ON public.admin_instructions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Instructions: All authenticated users can read active instructions
CREATE POLICY "Authenticated users can read active instructions" ON public.admin_instructions
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Index for fast tag-based queries
CREATE INDEX IF NOT EXISTS idx_admin_instructions_tags ON public.admin_instructions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_admin_instructions_active ON public.admin_instructions(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_admin_instructions_category ON public.admin_instructions(category_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_admin_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_instructions_updated_at
    BEFORE UPDATE ON public.admin_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_instructions_updated_at();

-- Insert default category and instructions for pantry scanning
INSERT INTO public.admin_instruction_categories (name, description) VALUES
('Pantry Scanning', 'Rules for AI when scanning pantry images, video, or audio')
ON CONFLICT (name) DO NOTHING;

-- Insert default pantry scanning rules
INSERT INTO public.admin_instructions (category_id, title, instruction_text, tags, priority)
SELECT
    c.id,
    'Generic Item Prevention',
    'Do not add generic items like "canned goods", "seasoning", "spices", or "condiments" if the AI cannot identify exactly what the item is. Only add specific, identifiable items (e.g., "tomato sauce" not "canned goods", "oregano" not "seasoning").',
    ARRAY['pantry_scanning'],
    100
FROM public.admin_instruction_categories c
WHERE c.name = 'Pantry Scanning'
AND NOT EXISTS (
    SELECT 1 FROM public.admin_instructions
    WHERE title = 'Generic Item Prevention' AND category_id = c.id
);

INSERT INTO public.admin_instructions (category_id, title, instruction_text, tags, priority)
SELECT
    c.id,
    'Quantity Inclusion',
    'If quantities can be seen or reasonably inferred from the image/video/audio (e.g., "2 bottles of milk", "large bag of rice", "half gallon of orange juice"), include the quantity in the item name.',
    ARRAY['pantry_scanning'],
    99
FROM public.admin_instruction_categories c
WHERE c.name = 'Pantry Scanning'
AND NOT EXISTS (
    SELECT 1 FROM public.admin_instructions
    WHERE title = 'Quantity Inclusion' AND category_id = c.id
);

-- Add comments for documentation
COMMENT ON TABLE public.admin_instruction_categories IS 'Categories for organizing admin-managed AI instructions';
COMMENT ON TABLE public.admin_instructions IS 'AI instructions that are silently applied to prompts based on tags';
COMMENT ON COLUMN public.admin_instructions.tags IS 'Array of feature tags: meal_planner, recipe_generation, pantry_scanning';
COMMENT ON COLUMN public.admin_instructions.priority IS 'Higher priority instructions are applied first in prompts';
