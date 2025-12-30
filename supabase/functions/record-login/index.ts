import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

// IP geolocation service - using ip-api.com (free tier allows 45 requests/minute)
const GEOIP_URL = 'http://ip-api.com/json';

interface GeoIPResponse {
  status: 'success' | 'fail';
  country?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  message?: string;
}

interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

// Parse user agent to extract browser, OS, and device type
function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('linux') && !ua.includes('android')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  }

  return { browser, os, deviceType };
}

// Get geolocation from IP
async function getGeoLocation(ip: string): Promise<GeoIPResponse | null> {
  // Skip geolocation for localhost/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null;
  }

  try {
    const response = await fetch(`${GEOIP_URL}/${ip}?fields=status,message,country,regionName,city,lat,lon`);
    if (!response.ok) return null;

    const data: GeoIPResponse = await response.json();
    if (data.status === 'fail') return null;

    return data;
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
}

// Get client IP from request headers
function getClientIP(req: Request): string | null {
  // Try various headers that might contain the real IP
  const headers = [
    'cf-connecting-ip',        // Cloudflare
    'x-real-ip',               // Nginx
    'x-forwarded-for',         // Standard proxy header
    'x-client-ip',             // Apache
    'true-client-ip',          // Akamai
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, loginMethod } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure the user can only record their own login
    if (userId !== auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot record login for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client information
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    // Get geolocation (don't wait if it fails)
    let geo: GeoIPResponse | null = null;
    if (clientIP) {
      geo = await getGeoLocation(clientIP);
    }

    // Create Supabase admin client to insert login record
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert login record
    const { error: insertError } = await supabaseAdmin
      .from('login_history')
      .insert({
        user_id: userId,
        ip_address: clientIP,
        user_agent: userAgent.substring(0, 500), // Limit length
        device_type: deviceType,
        browser,
        os,
        country: geo?.country || null,
        city: geo?.city || null,
        region: geo?.regionName || null,
        latitude: geo?.lat || null,
        longitude: geo?.lon || null,
        login_method: loginMethod || 'unknown',
        success: true,
      });

    if (insertError) {
      console.error('Error inserting login record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record login' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Record login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
