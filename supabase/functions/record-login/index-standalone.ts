// Self-contained version for Supabase Dashboard deployment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

async function verifyAuth(req: Request): Promise<{ userId: string } | null> {
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

  if (error || !user) {
    return null;
  }

  return { userId: user.id };
}

// IP geolocation service
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

function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase();

  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    deviceType = 'mobile';
  }

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

async function getGeoLocation(ip: string): Promise<GeoIPResponse | null> {
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

function getClientIP(req: Request): string | null {
  const headers = [
    'cf-connecting-ip',
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
    'true-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, loginMethod } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userId !== auth.userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot record login for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    let geo: GeoIPResponse | null = null;
    if (clientIP) {
      geo = await getGeoLocation(clientIP);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: insertError } = await supabaseAdmin
      .from('login_history')
      .insert({
        user_id: userId,
        ip_address: clientIP,
        user_agent: userAgent.substring(0, 500),
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
