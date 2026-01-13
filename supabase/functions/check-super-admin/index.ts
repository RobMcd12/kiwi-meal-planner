// Edge Function to check if user is super admin
// SECURITY: Super admin email is stored in Supabase secrets, not in client code

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors, getCorsHeaders } from '../_shared/cors.ts';

// Get super admin email from environment (set via Supabase secrets)
const SUPER_ADMIN_EMAIL = Deno.env.get('SUPER_ADMIN_EMAIL') || '';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: responseHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');

    // Debug logging
    console.log('check-super-admin - SUPABASE_URL exists:', !!supabaseUrl);
    console.log('check-super-admin - SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
    console.log('check-super-admin - Authorization header exists:', !!authHeader);
    console.log('check-super-admin - SUPER_ADMIN_EMAIL exists:', !!SUPER_ADMIN_EMAIL);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ isSuperAdmin: false, error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!authHeader) {
      console.error('No Authorization header provided');
      return new Response(
        JSON.stringify({ isSuperAdmin: false, error: 'Not authenticated - no token' }),
        {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with the auth header from the request
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(
        JSON.stringify({ isSuperAdmin: false, error: 'Authentication failed' }),
        {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!user) {
      console.error('No user found for token');
      return new Response(
        JSON.stringify({ isSuperAdmin: false, error: 'Not authenticated' }),
        {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('User authenticated:', user.id, user.email);

    // Check if user email matches super admin
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL && SUPER_ADMIN_EMAIL !== '';

    return new Response(
      JSON.stringify({
        isSuperAdmin,
        // Don't expose the actual super admin email in the response
      }),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return new Response(
      JSON.stringify({ isSuperAdmin: false, error: 'Internal error' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
