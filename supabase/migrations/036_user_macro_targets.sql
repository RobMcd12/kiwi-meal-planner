-- User macro targets for nutrition tracking
-- Pro users can set custom daily targets, free users see recommended defaults

CREATE TABLE IF NOT EXISTS public.user_macro_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Core macros (required)
    calories INTEGER NOT NULL DEFAULT 2000,
    protein INTEGER NOT NULL DEFAULT 50,
    carbohydrates INTEGER NOT NULL DEFAULT 250,
    fat INTEGER NOT NULL DEFAULT 65,
    -- Optional macros
    fiber INTEGER DEFAULT 25,
    sugar INTEGER DEFAULT 50,
    sodium INTEGER DEFAULT 2300,
    saturated_fat INTEGER DEFAULT 20,
    -- Metadata
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_macro_targets ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own targets
CREATE POLICY "Users can view own macro targets"
    ON public.user_macro_targets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own macro targets"
    ON public.user_macro_targets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own macro targets"
    ON public.user_macro_targets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own macro targets"
    ON public.user_macro_targets FOR DELETE
    USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_macro_targets_user ON public.user_macro_targets(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_macro_targets_updated_at
    BEFORE UPDATE ON public.user_macro_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.user_macro_targets IS 'Daily macro nutrient targets per user. Pro users can customize, free users use defaults.';
COMMENT ON COLUMN public.user_macro_targets.is_custom IS 'True if user has set custom values (Pro feature). False means using recommended defaults.';
