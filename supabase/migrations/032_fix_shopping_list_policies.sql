-- Fix shopping list selections policies (drop if exists and recreate)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own shopping list selections" ON public.shopping_list_selections;
DROP POLICY IF EXISTS "Users can insert own shopping list selections" ON public.shopping_list_selections;
DROP POLICY IF EXISTS "Users can update own shopping list selections" ON public.shopping_list_selections;
DROP POLICY IF EXISTS "Users can delete own shopping list selections" ON public.shopping_list_selections;

-- Recreate policies
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

-- Ensure index exists (will no-op if already exists)
CREATE INDEX IF NOT EXISTS idx_shopping_list_selections_user ON public.shopping_list_selections(user_id);

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_shopping_list_selections_updated_at ON public.shopping_list_selections;
CREATE TRIGGER update_shopping_list_selections_updated_at
    BEFORE UPDATE ON public.shopping_list_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
