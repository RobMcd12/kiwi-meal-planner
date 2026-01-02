-- Shopping List Selections
-- Stores user's selected plans and recipes for their master shopping list

-- Create shopping list selections table
CREATE TABLE IF NOT EXISTS public.shopping_list_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Selected plans and recipes (stored as arrays of IDs)
    selected_plan_ids UUID[] DEFAULT '{}',
    selected_recipe_ids UUID[] DEFAULT '{}',

    -- Checked off items (item IDs that have been marked as purchased)
    checked_item_ids TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One record per user
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.shopping_list_selections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own shopping list selections
CREATE POLICY "Users can view own shopping list selections"
    ON public.shopping_list_selections
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping list selections"
    ON public.shopping_list_selections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping list selections"
    ON public.shopping_list_selections
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping list selections"
    ON public.shopping_list_selections
    FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast user lookup
CREATE INDEX idx_shopping_list_selections_user ON public.shopping_list_selections(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_shopping_list_selections_updated_at
    BEFORE UPDATE ON public.shopping_list_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.shopping_list_selections IS 'Stores user selections for the master shopping list feature';
