-- Migration 021: Recipe Videos System
-- AI-generated cooking videos stored on Google Drive with admin management

-- ============================================
-- 1. ADMIN GOOGLE DRIVE CONFIG (Singleton)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_google_drive_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    drive_folder_id TEXT,
    drive_folder_name TEXT,
    configured_by UUID REFERENCES auth.users(id),
    configured_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert singleton row
INSERT INTO public.admin_google_drive_config (id)
VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. RECIPE VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.recipe_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES public.favorite_meals(id) ON DELETE CASCADE,
    -- Storage location (supports both Google Drive and Supabase Storage)
    storage_type TEXT CHECK (storage_type IN ('google_drive', 'supabase')) DEFAULT 'supabase',
    -- Google Drive fields
    google_drive_file_id TEXT,
    google_drive_url TEXT,
    -- Supabase Storage fields
    supabase_storage_path TEXT,
    -- Common fields
    video_url TEXT, -- Resolved playable URL (computed based on storage_type)
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    processing_status TEXT CHECK (processing_status IN ('pending', 'generating', 'uploading', 'complete', 'failed')) DEFAULT 'pending',
    generation_prompt TEXT,
    instructions_used JSONB,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure one video per recipe
    UNIQUE(meal_id)
);

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE public.admin_google_drive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_videos ENABLE ROW LEVEL SECURITY;

-- Drive config: Only admins can read/update
CREATE POLICY "Admins can view drive config" ON public.admin_google_drive_config
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update drive config" ON public.admin_google_drive_config
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Videos: Anyone can read (visibility controlled at app level), admins can manage
CREATE POLICY "Anyone can view recipe videos" ON public.recipe_videos
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert recipe videos" ON public.recipe_videos
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can update recipe videos" ON public.recipe_videos
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Admins can delete recipe videos" ON public.recipe_videos
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recipe_videos_meal ON public.recipe_videos(meal_id);
CREATE INDEX IF NOT EXISTS idx_recipe_videos_status ON public.recipe_videos(processing_status);
CREATE INDEX IF NOT EXISTS idx_recipe_videos_created_by ON public.recipe_videos(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_videos_created_at ON public.recipe_videos(created_at DESC);

-- ============================================
-- 5. TRIGGERS
-- ============================================
CREATE TRIGGER update_recipe_videos_updated_at
    BEFORE UPDATE ON public.recipe_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drive_config_updated_at
    BEFORE UPDATE ON public.admin_google_drive_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. COMMENTS
-- ============================================
COMMENT ON TABLE public.admin_google_drive_config IS 'Singleton table storing OAuth tokens for admin Google Drive integration';
COMMENT ON TABLE public.recipe_videos IS 'AI-generated cooking videos stored on Google Drive';
COMMENT ON COLUMN public.recipe_videos.processing_status IS 'pending=created, generating=AI working, uploading=to Drive, complete=ready, failed=error';
COMMENT ON COLUMN public.recipe_videos.instructions_used IS 'Snapshot of admin instructions applied during video generation';
