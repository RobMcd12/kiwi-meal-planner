-- Migration: Media Uploads for Video/Audio Pantry Scanning
-- Stores metadata for uploaded video and audio files used for pantry scanning
-- Files are stored in Supabase Storage with 10-day retention

-- Media uploads table
CREATE TABLE IF NOT EXISTS public.media_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('video', 'audio')),
    original_filename TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    duration_seconds INTEGER,
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
    processed_items JSONB, -- ScannedPantryResult structure
    error_message TEXT,
    expires_at TIMESTAMPTZ NOT NULL, -- 10 days from upload
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own uploads
CREATE POLICY "Users can view own media uploads" ON public.media_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media uploads" ON public.media_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media uploads" ON public.media_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media uploads" ON public.media_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_media_uploads_user ON public.media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_expires ON public.media_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_media_uploads_status ON public.media_uploads(processing_status);

-- Comments for documentation
COMMENT ON TABLE public.media_uploads IS 'Stores metadata for video/audio files used in pantry scanning with 10-day retention';
COMMENT ON COLUMN public.media_uploads.storage_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN public.media_uploads.processed_items IS 'JSON result from AI processing (ScannedPantryResult structure)';
COMMENT ON COLUMN public.media_uploads.expires_at IS 'Files are automatically deleted after this timestamp (10 days from upload)';

-- Note: The storage bucket "pantry-media" needs to be created manually via Supabase dashboard
-- with the following policies:
--   - Users can upload files to their own folder: storage.foldername = auth.uid()::text
--   - Users can read/delete their own files
--   - 50MB file size limit recommended

-- Note: A scheduled function or pg_cron job should be set up to clean up expired files:
-- DELETE FROM public.media_uploads WHERE expires_at < NOW();
-- Plus corresponding cleanup of files in the storage bucket
