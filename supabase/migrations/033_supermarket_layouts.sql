-- Supermarket Layouts
-- Allows users to save custom supermarket aisle orderings for their shopping lists

-- Create supermarket layouts table
CREATE TABLE IF NOT EXISTS public.supermarket_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,

    -- Category order (array of category names in order)
    category_order TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.supermarket_layouts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own layouts
CREATE POLICY "Users can view own supermarket layouts"
    ON public.supermarket_layouts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supermarket layouts"
    ON public.supermarket_layouts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own supermarket layouts"
    ON public.supermarket_layouts
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own supermarket layouts"
    ON public.supermarket_layouts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast user lookup
CREATE INDEX idx_supermarket_layouts_user ON public.supermarket_layouts(user_id);
CREATE INDEX idx_supermarket_layouts_default ON public.supermarket_layouts(user_id, is_default) WHERE is_default = true;

-- Trigger to update updated_at
CREATE TRIGGER update_supermarket_layouts_updated_at
    BEFORE UPDATE ON public.supermarket_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default layout per user
CREATE OR REPLACE FUNCTION ensure_single_default_layout()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.supermarket_layouts
        SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_layout_trigger
    BEFORE INSERT OR UPDATE ON public.supermarket_layouts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_layout();

-- Add comment
COMMENT ON TABLE public.supermarket_layouts IS 'Stores user-defined supermarket aisle orderings for shopping list sorting';
