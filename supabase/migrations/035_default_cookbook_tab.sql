-- Add default cookbook tab preference to profiles
-- This allows users to set their preferred default tab when opening the cookbook

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_cookbook_tab TEXT
CHECK (default_cookbook_tab IN ('all', 'favourites', 'generated', 'uploaded', 'public'));

COMMENT ON COLUMN public.profiles.default_cookbook_tab IS 'User preferred default tab when opening cookbook. NULL means use smart default (favourites if any exist, else all).';
