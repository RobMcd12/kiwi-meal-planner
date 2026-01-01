import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Create Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Verify user is admin
async function verifyAdmin(req: Request): Promise<{ userId: string; error?: string } | null> {
  const authHeader = req.headers.get('Authorization');
  console.log('Auth header present:', !!authHeader);

  if (!authHeader) {
    console.log('No Authorization header');
    return null;
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  console.log('Auth result:', { userId: user?.id, error: error?.message });

  if (error || !user) {
    console.log('Auth failed:', error?.message || 'No user');
    return null;
  }

  // Check if user is admin using admin client
  const adminClient = getSupabaseAdmin();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  console.log('Profile check:', { is_admin: profile?.is_admin, error: profileError?.message });

  if (!profile?.is_admin) {
    console.log('User is not admin');
    return null;
  }

  return { userId: user.id };
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify admin access
    const admin = await verifyAdmin(req);
    if (!admin) {
      console.log('Admin verification failed');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - Admin access required',
          details: 'User is not authenticated or is not an admin'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Admin verified:', admin.userId);

    const { mealId, storageType = 'supabase', customPrompt } = await req.json();

    if (!mealId) {
      return new Response(
        JSON.stringify({ error: 'Missing mealId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdmin();

    // Check if video already exists for this recipe
    const { data: existing } = await adminClient
      .from('recipe_videos')
      .select('id')
      .eq('meal_id', mealId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Video already exists for this recipe. Delete it first to regenerate.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the video record using admin client (bypasses RLS)
    const { data, error } = await adminClient
      .from('recipe_videos')
      .insert({
        meal_id: mealId,
        storage_type: storageType,
        processing_status: 'pending',
        generation_prompt: customPrompt,
        created_by: admin.userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating video record:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger background video generation
    // This is fire-and-forget - the edge function will update the record when done
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-recipe-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') ?? '',
      },
      body: JSON.stringify({
        videoId: data.id,
        mealId,
        storageType,
      }),
    }).catch(err => {
      console.error('Error triggering video generation:', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        video: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create video record error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
