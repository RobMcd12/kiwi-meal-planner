-- Migration 038: Feedback Screen Recording
-- Add recording_url column to feedback table and create storage bucket

-- ============================================
-- 1. ADD RECORDING URL COLUMN
-- ============================================

ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS recording_url TEXT;

COMMENT ON COLUMN public.feedback.recording_url IS 'URL to screen recording video stored in Supabase Storage';

-- ============================================
-- 2. CREATE STORAGE BUCKET FOR FEEDBACK MEDIA
-- Note: This needs to be done via Supabase Dashboard or API
-- The bucket should be named 'feedback-media' with the following settings:
--   - Public: true (to allow playback)
--   - File size limit: 50MB
--   - Allowed MIME types: video/webm, video/mp4
-- ============================================

-- Storage policies would be set up in the dashboard, but here's the SQL equivalent:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-media', 'feedback-media', true);

-- Storage policies:
-- Allow authenticated users to upload to their own folder
-- CREATE POLICY "Users can upload feedback recordings"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'feedback-media'
--   AND auth.role() = 'authenticated'
--   AND (storage.foldername(name))[1] = 'feedback-recordings'
--   AND (storage.foldername(name))[2] = auth.uid()::text
-- );

-- Allow anyone to read (for admin viewing)
-- CREATE POLICY "Anyone can view feedback recordings"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'feedback-media');

-- Allow admins to delete old recordings
-- CREATE POLICY "Admins can delete feedback recordings"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'feedback-media'
--   AND public.is_admin_user(auth.uid())
-- );
