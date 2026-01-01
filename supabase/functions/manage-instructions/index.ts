import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Create Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Verify user is admin - returns detailed error info for debugging
async function verifyAdmin(req: Request): Promise<{ userId: string } | { error: string; details: string }> {
  const authHeader = req.headers.get('Authorization');
  console.log('Auth header present:', !!authHeader);

  if (!authHeader) {
    console.log('No Authorization header found');
    return { error: 'No Authorization header', details: 'Request missing Authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  console.log('Supabase URL configured:', !!supabaseUrl);
  console.log('Anon key configured:', !!anonKey);

  if (!supabaseUrl || !anonKey) {
    return { error: 'Missing config', details: `URL: ${!!supabaseUrl}, ANON_KEY: ${!!anonKey}` };
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  console.log('Auth getUser result:', { userId: user?.id, error: error?.message });

  if (error || !user) {
    console.log('Auth failed:', error?.message || 'No user');
    return { error: 'Auth failed', details: error?.message || 'No user returned from getUser()' };
  }

  // Check if user is admin using admin client
  const adminClient = getSupabaseAdmin();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle(); // Use maybeSingle to handle missing profiles

  console.log('Profile check:', { is_admin: profile?.is_admin, error: profileError?.message });

  if (profileError) {
    return { error: 'Profile lookup failed', details: profileError.message };
  }

  if (!profile) {
    return { error: 'No profile found', details: `User ${user.id} has no profile record. Please contact support.` };
  }

  if (!profile.is_admin) {
    console.log('User is not admin');
    return { error: 'Not admin', details: `User ${user.id} is_admin: ${profile.is_admin}` };
  }

  return { userId: user.id };
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify admin access
    const adminResult = await verifyAdmin(req);
    if ('error' in adminResult) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - Admin access required',
          reason: adminResult.error,
          details: adminResult.details
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const admin = adminResult;

    const { action, data } = await req.json();
    const adminClient = getSupabaseAdmin();

    switch (action) {
      case 'createInstruction': {
        const { categoryId, title, instructionText, tags, priority } = data;

        const { data: result, error } = await adminClient
          .from('admin_instructions')
          .insert({
            category_id: categoryId,
            title,
            instruction_text: instructionText,
            tags: tags || [],
            priority: priority ?? 0,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, instruction: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateInstruction': {
        const { id, updates } = data;
        const updateData: Record<string, unknown> = {};

        if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.instructionText !== undefined) updateData.instruction_text = updates.instructionText;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
        if (updates.priority !== undefined) updateData.priority = updates.priority;

        const { error } = await adminClient
          .from('admin_instructions')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteInstruction': {
        const { id } = data;
        const { error } = await adminClient
          .from('admin_instructions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createCategory': {
        const { name, description } = data;
        const { data: result, error } = await adminClient
          .from('admin_instruction_categories')
          .insert({ name, description })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, category: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteCategory': {
        const { id } = data;
        const { error } = await adminClient
          .from('admin_instruction_categories')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Manage instructions error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
