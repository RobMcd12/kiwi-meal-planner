import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

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

// Get admin instructions for video generation
async function getVideoInstructions(): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('admin_ai_instructions')
    .select('instruction_text, title')
    .contains('tags', ['video_generation'])
    .eq('is_active', true)
    .order('priority', { ascending: false });

  return (data || []).map(i => i.instruction_text);
}

// Get recipe details
async function getRecipeDetails(mealId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('favorite_meals')
    .select('name, description, ingredients, instructions')
    .eq('id', mealId)
    .single();

  if (error) throw error;
  return data;
}

// Update video status
async function updateVideoStatus(
  videoId: string,
  status: string,
  updates?: Record<string, any>
) {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, any> = {
    processing_status: status,
    updated_at: new Date().toISOString(),
    ...updates,
  };

  await supabase
    .from('recipe_videos')
    .update(updateData)
    .eq('id', videoId);
}

// Generate video using Google Veo API (placeholder - actual implementation depends on API)
async function generateVideoWithVeo(
  recipe: { name: string; description: string; ingredients: any; instructions: string },
  instructions: string[]
): Promise<{ videoBlob: Blob; duration: number } | null> {
  const apiKey = Deno.env.get('GOOGLE_VEO_API_KEY');
  if (!apiKey) {
    console.error('GOOGLE_VEO_API_KEY not configured');
    return null;
  }

  // Build prompt from recipe and admin instructions
  const additionalInstructions = instructions.length > 0
    ? `\n\nFollow these guidelines:\n${instructions.join('\n')}`
    : '';

  const prompt = `Create a step-by-step cooking video for "${recipe.name}".

Recipe Description: ${recipe.description}

Ingredients: ${typeof recipe.ingredients === 'string' ? recipe.ingredients : JSON.stringify(recipe.ingredients)}

Instructions: ${recipe.instructions}${additionalInstructions}

The video should show each step clearly with smooth transitions, professional lighting, and appetizing food presentation.`;

  // Note: This is a placeholder for the actual Google Veo API call
  // The actual implementation would depend on the Veo API specification
  // For now, we'll simulate an error indicating API needs to be configured

  try {
    // Placeholder for actual API call
    // const response = await fetch('https://api.google.com/veo/v1/generate', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     prompt,
    //     duration: '60s',
    //     resolution: '1080p',
    //   }),
    // });

    // For now, return null to indicate video generation is not yet implemented
    console.log('Video generation prompt prepared:', prompt.substring(0, 200) + '...');
    throw new Error('Google Veo API integration pending. Video generation will be available once the API is configured.');
  } catch (error) {
    console.error('Video generation error:', error);
    throw error;
  }
}

// Upload video to Supabase Storage
async function uploadToSupabase(
  videoBlob: Blob,
  fileName: string,
  userId: string
): Promise<{ path: string; url: string } | null> {
  const supabase = getSupabaseAdmin();

  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}_${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('recipe-videos')
    .upload(storagePath, videoBlob, {
      contentType: 'video/mp4',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('recipe-videos')
    .getPublicUrl(storagePath);

  return {
    path: storagePath,
    url: urlData.publicUrl,
  };
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

    const { videoId, mealId, storageType = 'supabase' } = await req.json();

    if (!videoId || !mealId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId or mealId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to generating
    await updateVideoStatus(videoId, 'generating');

    // Get recipe details
    const recipe = await getRecipeDetails(mealId);
    if (!recipe) {
      await updateVideoStatus(videoId, 'failed', { error_message: 'Recipe not found' });
      return new Response(
        JSON.stringify({ error: 'Recipe not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin instructions for video generation
    const instructions = await getVideoInstructions();

    // Generate video
    try {
      const videoResult = await generateVideoWithVeo(recipe, instructions);

      if (!videoResult) {
        throw new Error('Video generation returned no result');
      }

      // Update status to uploading
      await updateVideoStatus(videoId, 'uploading');

      // Upload based on storage type
      if (storageType === 'supabase') {
        const fileName = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
        const uploadResult = await uploadToSupabase(videoResult.videoBlob, fileName, admin.userId);

        if (!uploadResult) {
          throw new Error('Failed to upload video to Supabase Storage');
        }

        await updateVideoStatus(videoId, 'complete', {
          supabase_storage_path: uploadResult.path,
          video_url: uploadResult.url,
          duration_seconds: videoResult.duration,
          file_size_bytes: videoResult.videoBlob.size,
        });
      } else {
        // Google Drive upload would be handled here
        throw new Error('Google Drive upload not implemented in this function');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (genError) {
      console.error('Video generation failed:', genError);
      await updateVideoStatus(videoId, 'failed', {
        error_message: genError.message || 'Video generation failed',
      });

      return new Response(
        JSON.stringify({ error: genError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Generate recipe video error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
