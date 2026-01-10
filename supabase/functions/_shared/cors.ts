// SECURITY: Allowed origins for CORS - restricts which domains can call Edge Functions
const ALLOWED_ORIGINS = [
  'https://kiwimealplanner.co.nz',
  'https://www.kiwimealplanner.co.nz',
  'https://kiwi-meal-planner-production.up.railway.app',
  'http://localhost:3000', // Local development
  'http://localhost:5173', // Vite dev server
];

// Get CORS headers for the requesting origin
export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is in allowed list
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Legacy export for backward compatibility - uses first allowed origin as default
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }
  return null;
}

// Helper to check if origin is allowed
export function isOriginAllowed(origin: string | null): boolean {
  return origin !== null && ALLOWED_ORIGINS.includes(origin);
}
