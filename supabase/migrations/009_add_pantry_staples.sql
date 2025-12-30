-- Migration: Add staples support to pantry_items
-- Staples are items users always keep stocked and can mark as needed for shopping

-- Add is_staple column to pantry_items table
ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS is_staple BOOLEAN DEFAULT FALSE;

-- Add needs_restock column for shopping list functionality
ALTER TABLE public.pantry_items
ADD COLUMN IF NOT EXISTS needs_restock BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.pantry_items.is_staple IS
'When true, this item is considered a staple that the user always keeps in stock';

COMMENT ON COLUMN public.pantry_items.needs_restock IS
'When true, this staple item needs to be added to the shopping list';

-- Create index for faster staple queries
CREATE INDEX IF NOT EXISTS idx_pantry_items_staple ON public.pantry_items(user_id, is_staple) WHERE is_staple = true;
