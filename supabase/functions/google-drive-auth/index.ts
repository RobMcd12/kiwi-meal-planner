import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Admin config row ID
const CONFIG_ID = '00000000-0000-0000-0000-000000000002';

// Google OAuth endpoints
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';

// Create Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Verify user is admin
async function verifyAdmin(req: Request): Promise<{ userId: string } | null> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) return null;

  // Check if user is admin
  const adminClient = getSupabaseAdmin();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;

  return { userId: user.id };
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: config } = await supabase
    .from('admin_google_drive_config')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', CONFIG_ID)
    .single();

  if (!config?.refresh_token) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : new Date(0);
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  if (expiresAt > now && config.access_token) {
    return config.access_token;
  }

  // Refresh the token
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') ?? '',
      refresh_token: config.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  if (!tokens.access_token) return null;

  // Save new access token
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600));

  await supabase
    .from('admin_google_drive_config')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', CONFIG_ID);

  return tokens.access_token;
}

// Exchange authorization code for tokens
async function exchangeCode(code: string, redirectUri: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await response.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    console.error('Token exchange failed:', tokens);
    return { success: false, error: tokens.error_description || 'Failed to get tokens' };
  }

  const supabase = getSupabaseAdmin();
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

  const { error } = await supabase
    .from('admin_google_drive_config')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', CONFIG_ID);

  if (error) {
    return { success: false, error: 'Failed to save tokens' };
  }

  return { success: true };
}

// List folders in Drive
async function listFolders(): Promise<{ id: string; name: string }[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];

  const response = await fetch(
    `${GOOGLE_DRIVE_API}/files?` + new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id,name)',
      orderBy: 'name',
    }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  return data.files || [];
}

// Create a folder in Drive
async function createFolder(folderName: string): Promise<{ id: string; name: string } | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const folder = await response.json();
  if (folder.id) {
    return { id: folder.id, name: folder.name };
  }
  return null;
}

// Upload video to Drive
async function uploadVideo(
  fileName: string,
  mimeType: string,
  fileData: string
): Promise<{ fileId: string; webViewLink: string; thumbnailLink?: string } | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  // Get configured folder ID
  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase
    .from('admin_google_drive_config')
    .select('drive_folder_id')
    .eq('id', CONFIG_ID)
    .single();

  if (!config?.drive_folder_id) return null;

  // Decode base64 file data
  const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

  // Create file metadata
  const metadata = {
    name: fileName,
    mimeType,
    parents: [config.drive_folder_id],
  };

  // Create multipart request
  const boundary = '-------' + Date.now().toString(16);
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';

  const metadataString = JSON.stringify(metadata);
  const requestBody = new Uint8Array([
    ...new TextEncoder().encode(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadataString +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n'
    ),
    ...binaryData,
    ...new TextEncoder().encode(closeDelimiter),
  ]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: requestBody,
    }
  );

  const file = await response.json();

  if (file.id) {
    // Make file viewable by anyone with link
    await fetch(`${GOOGLE_DRIVE_API}/files/${file.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    return {
      fileId: file.id,
      webViewLink: file.webViewLink,
      thumbnailLink: file.thumbnailLink,
    };
  }

  return null;
}

// Delete file from Drive
async function deleteFile(fileId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.ok;
}

// Get shareable link
async function getShareLink(fileId: string): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=webViewLink`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const file = await response.json();
  return file.webViewLink || null;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify admin access
    const admin = await verifyAdmin(req);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'exchange': {
        const result = await exchangeCode(params.code, params.redirectUri);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list-folders': {
        const folders = await listFolders();
        return new Response(JSON.stringify({ folders }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create-folder': {
        const folder = await createFolder(params.folderName);
        return new Response(JSON.stringify({ folder }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upload-video': {
        const file = await uploadVideo(params.fileName, params.mimeType, params.fileData);
        return new Response(JSON.stringify({ file }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete-file': {
        const success = await deleteFile(params.fileId);
        return new Response(JSON.stringify({ success }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-share-link': {
        const link = await getShareLink(params.fileId);
        return new Response(JSON.stringify({ link }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Google Drive auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
