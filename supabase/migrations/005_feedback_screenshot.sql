-- ============================================
-- Migration: 005_feedback_screenshot
-- Description: Add screenshot column to feedback table
-- ============================================

-- Add screenshot column to feedback table
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS screenshot TEXT;

-- Add comment
COMMENT ON COLUMN public.feedback.screenshot IS 'Base64 encoded screenshot image for visual context';
