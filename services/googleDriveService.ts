import { supabase, isSupabaseConfigured } from './authService';

// Google OAuth configuration
// These should be set in environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/admin/drive-callback`;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Access to files created by the app
].join(' ');

// ============================================
// OAUTH FLOW
// ============================================

/**
 * Initiate Google Drive OAuth flow
 * Redirects user to Google consent screen
 */
export const initiateGoogleDriveAuth = (): void => {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Drive Client ID not configured');
    alert('Google Drive integration is not configured. Please set VITE_GOOGLE_DRIVE_CLIENT_ID.');
    return;
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_SCOPES);
  authUrl.searchParams.set('access_type', 'offline'); // Get refresh token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
  authUrl.searchParams.set('state', generateStateToken()); // CSRF protection

  // Store state in sessionStorage for verification
  sessionStorage.setItem('google_oauth_state', authUrl.searchParams.get('state')!);

  window.location.href = authUrl.toString();
};

/**
 * Handle OAuth callback - exchange code for tokens
 * Called from the callback page
 */
export const handleOAuthCallback = async (
  code: string,
  state: string
): Promise<{ success: boolean; error?: string }> => {
  // Verify state token
  const storedState = sessionStorage.getItem('google_oauth_state');
  if (state !== storedState) {
    return { success: false, error: 'Invalid state token. Please try again.' };
  }
  sessionStorage.removeItem('google_oauth_state');

  try {
    // Call Edge Function to exchange code for tokens
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: {
        action: 'exchange',
        code,
        redirectUri: GOOGLE_REDIRECT_URI,
      },
    });

    if (error) throw error;

    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to exchange code for tokens' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    return { success: false, error: err.message || 'Failed to complete authentication' };
  }
};

/**
 * Check if Google Drive is connected
 */
export const isGoogleDriveConnected = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data, error } = await supabase
      .from('admin_google_drive_config')
      .select('refresh_token, drive_folder_id')
      .eq('id', '00000000-0000-0000-0000-000000000002')
      .single();

    if (error) return false;

    return !!(data?.refresh_token && data?.drive_folder_id);
  } catch {
    return false;
  }
};

// ============================================
// DRIVE OPERATIONS (via Edge Functions)
// ============================================

/**
 * List folders in the user's Drive for selection
 */
export const listDriveFolders = async (): Promise<{ id: string; name: string }[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: { action: 'list-folders' },
    });

    if (error) throw error;

    return data?.folders || [];
  } catch (err) {
    console.error('Error listing Drive folders:', err);
    return [];
  }
};

/**
 * Create a new folder in Drive for recipe videos
 */
export const createDriveFolder = async (folderName: string): Promise<{ id: string; name: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: {
        action: 'create-folder',
        folderName,
      },
    });

    if (error) throw error;

    return data?.folder || null;
  } catch (err) {
    console.error('Error creating Drive folder:', err);
    return null;
  }
};

/**
 * Upload a video file to Google Drive
 */
export const uploadVideoToDrive = async (
  videoBlob: Blob,
  fileName: string,
  mimeType: string = 'video/mp4'
): Promise<{ fileId: string; webViewLink: string; thumbnailLink?: string } | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Convert blob to base64 for transfer
    const base64 = await blobToBase64(videoBlob);

    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: {
        action: 'upload-video',
        fileName,
        mimeType,
        fileData: base64,
      },
    });

    if (error) throw error;

    return data?.file || null;
  } catch (err) {
    console.error('Error uploading video to Drive:', err);
    return null;
  }
};

/**
 * Delete a video from Google Drive
 */
export const deleteVideoFromDrive = async (fileId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: {
        action: 'delete-file',
        fileId,
      },
    });

    if (error) throw error;

    return data?.success || false;
  } catch (err) {
    console.error('Error deleting video from Drive:', err);
    return false;
  }
};

/**
 * Get a shareable link for a video
 */
export const getVideoShareLink = async (fileId: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: {
        action: 'get-share-link',
        fileId,
      },
    });

    if (error) throw error;

    return data?.link || null;
  } catch (err) {
    console.error('Error getting video share link:', err);
    return null;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random state token for CSRF protection
 */
function generateStateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if Google Drive client ID is configured
 */
export const isGoogleDriveClientConfigured = (): boolean => {
  return !!GOOGLE_CLIENT_ID;
};

/**
 * Get the OAuth redirect URI for display in admin settings
 */
export const getOAuthRedirectUri = (): string => {
  return GOOGLE_REDIRECT_URI;
};
