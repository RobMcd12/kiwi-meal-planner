-- Migration 018: Add quantity and unit to pantry items
-- Allows users to track amounts of items in their pantry

-- Add quantity column (numeric value)
ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2);

-- Add unit column (measurement unit)
ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.pantry_items.quantity IS
'The numeric quantity of the item (e.g., 2 for "2 kg")';

COMMENT ON COLUMN public.pantry_items.unit IS
'The unit of measurement (e.g., "kg", "cups", "pieces")';
