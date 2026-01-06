-- Migration 040: Create Feedback Media Storage Bucket
-- Creates the storage bucket and policies for feedback screen recordings

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================

-- Create the feedback-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-media',
  'feedback-media',
  true,  -- Public bucket for easy video playback
  52428800,  -- 50MB limit
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/webm', 'video/mp4', 'video/quicktime']::text[];

-- ============================================
-- 2. STORAGE POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload feedback recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback recordings" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete feedback recordings" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload feedback recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-media'
  AND (storage.foldername(name))[1] = 'feedback-recordings'
);

-- Allow anyone to read/view recordings (public bucket)
CREATE POLICY "Anyone can view feedback recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-media');

-- Allow admins to delete recordings
CREATE POLICY "Admins can delete feedback recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-media'
  AND public.is_admin_user(auth.uid())
);
