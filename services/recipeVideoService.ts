import { supabase, isSupabaseConfigured } from './authService';
import type { RecipeVideo, GoogleDriveConfig, VideoStorageType, VideoProcessingStatus, AdminInstruction } from '../types';

// ============================================
// VIDEO CRUD OPERATIONS
// ============================================

/**
 * Get video for a specific recipe
 */
export const getRecipeVideo = async (mealId: string): Promise<RecipeVideo | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('recipe_videos')
      .select('*')
      .eq('meal_id', mealId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    // Fetch related data separately
    const mealName = await getMealName(mealId);
    const creatorName = data.created_by ? await getProfileName(data.created_by) : undefined;

    return mapVideoRow({ ...data, mealName, creatorName });
  } catch (err) {
    console.error('Error fetching recipe video:', err);
    return null;
  }
};

/**
 * Get all recipe videos (admin function)
 */
export const getAllRecipeVideos = async (): Promise<RecipeVideo[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    // Fetch videos without FK relationships
    const { data: videos, error } = await supabase
      .from('recipe_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!videos || videos.length === 0) return [];

    // Get unique meal IDs and creator IDs
    const mealIds = [...new Set(videos.map(v => v.meal_id).filter(Boolean))];
    const creatorIds = [...new Set(videos.map(v => v.created_by).filter(Boolean))];

    // Fetch meals and profiles separately
    const [mealsResult, profilesResult] = await Promise.all([
      mealIds.length > 0
        ? supabase.from('favorite_meals').select('id, name').in('id', mealIds)
        : { data: [] },
      creatorIds.length > 0
        ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
        : { data: [] }
    ]);

    // Create lookup maps
    const mealMap = new Map((mealsResult.data || []).map(m => [m.id, m.name]));
    const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p.full_name]));

    // Map videos with looked-up data
    return videos.map(video => ({
      ...mapVideoRow(video),
      mealName: mealMap.get(video.meal_id),
      createdByName: profileMap.get(video.created_by),
    }));
  } catch (err) {
    console.error('Error fetching all recipe videos:', err);
    return [];
  }
};

/**
 * Get videos by processing status
 */
export const getVideosByStatus = async (status: VideoProcessingStatus): Promise<RecipeVideo[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    // Fetch videos without FK relationships
    const { data: videos, error } = await supabase
      .from('recipe_videos')
      .select('*')
      .eq('processing_status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!videos || videos.length === 0) return [];

    // Get unique meal IDs and creator IDs
    const mealIds = [...new Set(videos.map(v => v.meal_id).filter(Boolean))];
    const creatorIds = [...new Set(videos.map(v => v.created_by).filter(Boolean))];

    // Fetch meals and profiles separately
    const [mealsResult, profilesResult] = await Promise.all([
      mealIds.length > 0
        ? supabase.from('favorite_meals').select('id, name').in('id', mealIds)
        : { data: [] },
      creatorIds.length > 0
        ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
        : { data: [] }
    ]);

    // Create lookup maps
    const mealMap = new Map((mealsResult.data || []).map(m => [m.id, m.name]));
    const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p.full_name]));

    // Map videos with looked-up data
    return videos.map(video => ({
      ...mapVideoRow(video),
      mealName: mealMap.get(video.meal_id),
      createdByName: profileMap.get(video.created_by),
    }));
  } catch (err) {
    console.error('Error fetching videos by status:', err);
    return [];
  }
};

/**
 * Get total video count
 */
export const getVideoCount = async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;

  try {
    const { count, error } = await supabase
      .from('recipe_videos')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (err) {
    console.error('Error getting video count:', err);
    return 0;
  }
};

/**
 * Get completed video count
 */
export const getCompletedVideoCount = async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0;

  try {
    const { count, error } = await supabase
      .from('recipe_videos')
      .select('*', { count: 'exact', head: true })
      .eq('processing_status', 'complete');

    if (error) throw error;

    return count || 0;
  } catch (err) {
    console.error('Error getting completed video count:', err);
    return 0;
  }
};

/**
 * Initiate video generation for a recipe
 * Uses an Edge Function with service role to bypass RLS for the insert
 */
export const initiateVideoGeneration = async (
  mealId: string,
  storageType: VideoStorageType = 'supabase',
  customPrompt?: string
): Promise<RecipeVideo | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Get current session to ensure we have auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Use Edge Function to create video record (bypasses RLS using service role)
    const { data, error } = await supabase.functions.invoke('create-video-record', {
      body: {
        mealId,
        storageType,
        customPrompt,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to create video record');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.video) {
      throw new Error('No video data returned');
    }

    // Map the response
    const video: RecipeVideo = mapVideoRow(data.video);

    // Fetch related data separately
    const mealName = await getMealName(mealId);
    const { data: { user } } = await supabase.auth.getUser();
    const creatorName = user ? await getProfileName(user.id) : undefined;

    return {
      ...video,
      mealName,
      createdByName: creatorName,
    };
  } catch (err) {
    console.error('Error initiating video generation:', err);
    throw err;
  }
};

/**
 * Trigger video generation in the background via Edge Function
 * This runs asynchronously and doesn't block the UI
 */
const triggerBackgroundGeneration = async (
  videoId: string,
  mealId: string,
  storageType: VideoStorageType
): Promise<void> => {
  try {
    // Call Edge Function without awaiting - runs in background
    supabase.functions.invoke('generate-recipe-video', {
      body: {
        videoId,
        mealId,
        storageType,
      },
    }).then(({ error }) => {
      if (error) {
        console.error('Background video generation error:', error);
        // Update status to failed if there's an error
        updateVideoStatus(videoId, 'failed', { errorMessage: error.message });
      }
    }).catch((err) => {
      console.error('Background video generation failed:', err);
      updateVideoStatus(videoId, 'failed', { errorMessage: 'Generation request failed' });
    });
  } catch (err) {
    console.error('Error triggering background generation:', err);
  }
};

/**
 * Update video processing status
 */
export const updateVideoStatus = async (
  id: string,
  status: VideoProcessingStatus,
  updates?: {
    videoUrl?: string;
    thumbnailUrl?: string;
    googleDriveFileId?: string;
    googleDriveUrl?: string;
    supabaseStoragePath?: string;
    durationSeconds?: number;
    fileSizeBytes?: number;
    instructionsUsed?: AdminInstruction[];
    errorMessage?: string;
  }
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const updateData: any = {
      processing_status: status,
      updated_at: new Date().toISOString(),
    };

    if (updates) {
      if (updates.videoUrl) updateData.video_url = updates.videoUrl;
      if (updates.thumbnailUrl) updateData.thumbnail_url = updates.thumbnailUrl;
      if (updates.googleDriveFileId) updateData.google_drive_file_id = updates.googleDriveFileId;
      if (updates.googleDriveUrl) updateData.google_drive_url = updates.googleDriveUrl;
      if (updates.supabaseStoragePath) updateData.supabase_storage_path = updates.supabaseStoragePath;
      if (updates.durationSeconds) updateData.duration_seconds = updates.durationSeconds;
      if (updates.fileSizeBytes) updateData.file_size_bytes = updates.fileSizeBytes;
      if (updates.instructionsUsed) updateData.instructions_used = updates.instructionsUsed;
      if (updates.errorMessage) updateData.error_message = updates.errorMessage;
    }

    const { error } = await supabase
      .from('recipe_videos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error updating video status:', err);
    return false;
  }
};

/**
 * Delete a recipe video
 */
export const deleteRecipeVideo = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    // First get the video to check storage type and paths
    const { data: video, error: fetchError } = await supabase
      .from('recipe_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from Supabase Storage if applicable
    if (video.storage_type === 'supabase' && video.supabase_storage_path) {
      const { error: storageError } = await supabase.storage
        .from('recipe-videos')
        .remove([video.supabase_storage_path]);

      if (storageError) {
        console.warn('Error deleting video from storage:', storageError);
        // Continue with DB deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('recipe_videos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error deleting recipe video:', err);
    return false;
  }
};

/**
 * Regenerate a video (delete and create new)
 */
export const regenerateVideo = async (
  videoId: string,
  storageType?: VideoStorageType
): Promise<RecipeVideo | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Get the existing video to get meal_id
    const { data: existing, error: fetchError } = await supabase
      .from('recipe_videos')
      .select('meal_id, storage_type')
      .eq('id', videoId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the existing video
    await deleteRecipeVideo(videoId);

    // Create a new video generation request
    return await initiateVideoGeneration(
      existing.meal_id,
      storageType || existing.storage_type
    );
  } catch (err) {
    console.error('Error regenerating video:', err);
    return null;
  }
};

// ============================================
// GOOGLE DRIVE CONFIG
// ============================================

/**
 * Get Google Drive configuration
 */
export const getGoogleDriveConfig = async (): Promise<GoogleDriveConfig> => {
  if (!isSupabaseConfigured()) {
    return { isConfigured: false };
  }

  try {
    const { data, error } = await supabase
      .from('admin_google_drive_config')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();

    if (error) throw error;

    return {
      isConfigured: !!(data.refresh_token && data.drive_folder_id),
      driveFolderId: data.drive_folder_id,
      driveFolderName: data.drive_folder_name,
      configuredBy: data.configured_by,
      configuredAt: data.configured_at,
    };
  } catch (err) {
    console.error('Error fetching Google Drive config:', err);
    return { isConfigured: false };
  }
};

/**
 * Save Google Drive OAuth tokens
 */
export const saveGoogleDriveTokens = async (
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
  folderId?: string,
  folderName?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('admin_google_drive_config')
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        drive_folder_id: folderId,
        drive_folder_name: folderName,
        configured_by: user.id,
        configured_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000002');

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error saving Google Drive tokens:', err);
    return false;
  }
};

/**
 * Update Drive folder selection
 */
export const updateDriveFolder = async (folderId: string, folderName: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('admin_google_drive_config')
      .update({
        drive_folder_id: folderId,
        drive_folder_name: folderName,
      })
      .eq('id', '00000000-0000-0000-0000-000000000002');

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error updating Drive folder:', err);
    return false;
  }
};

/**
 * Disconnect Google Drive
 */
export const disconnectGoogleDrive = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('admin_google_drive_config')
      .update({
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        drive_folder_id: null,
        drive_folder_name: null,
        configured_by: null,
        configured_at: null,
      })
      .eq('id', '00000000-0000-0000-0000-000000000002');

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error disconnecting Google Drive:', err);
    return false;
  }
};

// ============================================
// SUPABASE STORAGE
// ============================================

/**
 * Get signed URL for a video stored in Supabase
 */
export const getVideoSignedUrl = async (storagePath: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.storage
      .from('recipe-videos')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) throw error;

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting video signed URL:', err);
    return null;
  }
};

/**
 * Upload a video file to Supabase Storage
 */
export const uploadVideoToSupabase = async (
  file: Blob,
  fileName: string
): Promise<{ path: string; url: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recipe-videos')
      .upload(storagePath, file, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('recipe-videos')
      .getPublicUrl(storagePath);

    return {
      path: storagePath,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error('Error uploading video to Supabase:', err);
    return null;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get meal name by ID
 */
const getMealName = async (mealId: string): Promise<string | undefined> => {
  try {
    const { data } = await supabase
      .from('favorite_meals')
      .select('name')
      .eq('id', mealId)
      .single();
    return data?.name;
  } catch {
    return undefined;
  }
};

/**
 * Get profile name by user ID
 */
const getProfileName = async (userId: string): Promise<string | undefined> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    return data?.full_name;
  } catch {
    return undefined;
  }
};

/**
 * Map database row to RecipeVideo type
 * Note: mealName and createdByName should be set separately after calling this
 */
function mapVideoRow(row: any): RecipeVideo {
  return {
    id: row.id,
    mealId: row.meal_id,
    mealName: row.mealName, // Set separately via lookup
    storageType: row.storage_type,
    googleDriveFileId: row.google_drive_file_id,
    googleDriveUrl: row.google_drive_url,
    supabaseStoragePath: row.supabase_storage_path,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    fileSizeBytes: row.file_size_bytes,
    processingStatus: row.processing_status,
    generationPrompt: row.generation_prompt,
    instructionsUsed: row.instructions_used,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdByName: row.createdByName, // Set separately via lookup
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Format file size for display
 */
export const formatVideoFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
};

/**
 * Format duration for display
 */
export const formatVideoDuration = (seconds?: number): string => {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
