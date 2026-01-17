import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('delete-user: Starting request');
    console.log('delete-user: SUPABASE_URL exists:', !!supabaseUrl);
    console.log('delete-user: SERVICE_ROLE_KEY exists:', !!supabaseServiceRoleKey);
    console.log('delete-user: ANON_KEY exists:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('delete-user: Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    console.log('delete-user: Authorization header exists:', !!authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - No auth header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth to verify they're an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    console.log('delete-user: Auth check result - user:', requestingUser?.id, 'error:', authError?.message);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid authentication: ${authError?.message || 'No user found'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is an admin
    const { data: adminProfile, error: adminCheckError } = await userClient
      .from('profiles')
      .select('is_admin')
      .eq('id', requestingUser.id)
      .single();

    console.log('delete-user: Admin check - is_admin:', adminProfile?.is_admin, 'error:', adminCheckError?.message);

    if (adminCheckError || !adminProfile?.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: `Admin access required: ${adminCheckError?.message || 'Not an admin'}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID to delete from request body
    const { userId } = await req.json();
    console.log('delete-user: Target userId:', userId);
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent deleting yourself
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user to delete is an admin (prevent admin deletion)
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (targetProfile?.is_admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot delete admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete user's profile first (cascade should handle related data)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      // Continue anyway - profile might not exist
    }

    // Delete user from auth.users using admin API
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ success: false, error: authDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} deleted successfully by admin ${requestingUser.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
