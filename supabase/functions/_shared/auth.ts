import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

export async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');

  // Debug logging
  console.log('Auth check - SUPABASE_URL exists:', !!supabaseUrl);
  console.log('Auth check - SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
  console.log('Auth check - Authorization header exists:', !!authHeader);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration in Edge Function');
    return null;
  }

  if (!authHeader) {
    console.error('No Authorization header provided');
    return null;
  }

  const supabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error) {
    console.error('Auth verification error:', error.message);
    return null;
  }

  if (!user) {
    console.error('No user found for token');
    return null;
  }

  console.log('Auth successful for user:', user.id);
  return { userId: user.id };
}
