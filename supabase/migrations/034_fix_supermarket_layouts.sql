-- Fix supermarket layouts - add missing function and trigger
-- This migration handles the case where 033 partially applied

-- Drop existing trigger if it exists (to allow re-creation)
DROP TRIGGER IF EXISTS ensure_single_default_layout_trigger ON public.supermarket_layouts;

-- Drop and recreate the function to ensure it's properly defined
DROP FUNCTION IF EXISTS ensure_single_default_layout();

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

-- Create trigger
CREATE TRIGGER ensure_single_default_layout_trigger
    BEFORE INSERT OR UPDATE ON public.supermarket_layouts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_layout();
