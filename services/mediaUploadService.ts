import { supabase, isSupabaseConfigured } from './authService';
import type { MediaUpload, ScannedPantryResult } from '../types';

const STORAGE_BUCKET = 'pantry-media';
const RETENTION_DAYS = 10;

/**
 * Upload a media file (video or audio) to Supabase Storage
 * and create a metadata record in the database
 */
export const uploadMediaFile = async (
  file: File,
  mediaType: 'video' | 'audio'
): Promise<MediaUpload | null> => {
  if (!isSupabaseConfigured()) {
    console.error('Supabase not configured');
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  // Generate unique file path: {userId}/{timestamp}_{originalName}
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

  // Calculate expiry date (10 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

  try {
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    // Create metadata record
    const { data, error: dbError } = await supabase
      .from('media_uploads')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        media_type: mediaType,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        processing_status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating media record:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      storagePath: data.storage_path,
      mediaType: data.media_type,
      originalFilename: data.original_filename,
      fileSizeBytes: data.file_size_bytes,
      mimeType: data.mime_type,
      durationSeconds: data.duration_seconds,
      processingStatus: data.processing_status,
      processedItems: data.processed_items,
      errorMessage: data.error_message,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('Error in uploadMediaFile:', err);
    return null;
  }
};

/**
 * Get all media uploads for the current user
 */
export const getUserMediaUploads = async (): Promise<MediaUpload[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('media_uploads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching media uploads:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    storagePath: row.storage_path,
    mediaType: row.media_type,
    originalFilename: row.original_filename,
    fileSizeBytes: row.file_size_bytes,
    mimeType: row.mime_type,
    durationSeconds: row.duration_seconds,
    processingStatus: row.processing_status,
    processedItems: row.processed_items,
    errorMessage: row.error_message,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
};

/**
 * Delete a media upload and its file from storage
 */
export const deleteMediaUpload = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  // First get the storage path
  const { data: upload, error: fetchError } = await supabase
    .from('media_uploads')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !upload) {
    console.error('Error fetching media upload:', fetchError);
    return false;
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([upload.storage_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    // Continue to delete the database record anyway
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('media_uploads')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Error deleting media record:', dbError);
    return false;
  }

  return true;
};

/**
 * Update the processing status of a media upload
 */
export const updateMediaProcessingStatus = async (
  id: string,
  status: 'pending' | 'processing' | 'complete' | 'failed',
  result?: ScannedPantryResult,
  errorMessage?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const updateData: Record<string, unknown> = {
    processing_status: status,
  };

  if (result) {
    updateData.processed_items = result;
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  const { error } = await supabase
    .from('media_uploads')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating processing status:', error);
    return false;
  }

  return true;
};

/**
 * Get the public URL for a media file
 */
export const getMediaFileUrl = async (storagePath: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl || null;
};

/**
 * Calculate days until a media file expires
 */
export const getDaysUntilExpiry = (expiresAt: string): number => {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
