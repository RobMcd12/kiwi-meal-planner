/**
 * Rate Limiting Module for Supabase Edge Functions
 *
 * Implements a sliding window rate limiter using Supabase database
 * for distributed rate limiting across function instances.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

// Rate limit configurations per endpoint type
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  identifier: string;    // Endpoint identifier
}

// Default rate limits for different endpoint types
export const RATE_LIMITS = {
  // AI endpoints (expensive operations)
  AI_GENERATION: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 10,         // 10 requests per minute
    identifier: 'ai_generation',
  },
  // Standard API endpoints
  STANDARD: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 60,         // 60 requests per minute
    identifier: 'standard',
  },
  // Auth-related endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 attempts per 15 minutes
    identifier: 'auth',
  },
  // Admin endpoints
  ADMIN: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 30,         // 30 requests per minute
    identifier: 'admin',
  },
  // Webhook endpoints (higher limit for Stripe)
  WEBHOOK: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 100,        // 100 requests per minute
    identifier: 'webhook',
  },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

/**
 * Check rate limit for a user/IP
 * Uses database for distributed rate limiting
 */
export async function checkRateLimit(
  userId: string | null,
  ipAddress: string | null,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Use userId if authenticated, otherwise fall back to IP
  const identifier = userId || ipAddress || 'anonymous';
  const key = `${config.identifier}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Clean up old entries and count recent requests in one query
    const { data: recentRequests, error: countError } = await supabaseAdmin
      .from('rate_limit_logs')
      .select('created_at')
      .eq('rate_key', key)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (countError) {
      console.error('Rate limit check error:', countError);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    const requestCount = recentRequests?.length || 0;
    const remaining = Math.max(0, config.maxRequests - requestCount - 1);
    const resetAt = new Date(now.getTime() + config.windowMs);

    if (requestCount >= config.maxRequests) {
      // Calculate retry-after based on oldest request in window
      const oldestRequest = recentRequests?.[recentRequests.length - 1];
      const oldestTime = oldestRequest ? new Date(oldestRequest.created_at).getTime() : now.getTime();
      const retryAfter = Math.ceil((oldestTime + config.windowMs - now.getTime()) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    // Log this request
    await supabaseAdmin
      .from('rate_limit_logs')
      .insert({
        rate_key: key,
        user_id: userId,
        ip_address: ipAddress,
        endpoint: config.identifier,
        created_at: now.toISOString(),
      });

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (err) {
    console.error('Rate limit error:', err);
    // Fail open
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Simple in-memory rate limiter for functions that don't need distributed limiting
 * Note: This only works within a single function instance
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function checkMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt < now) {
        memoryStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // New window
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: new Date(record.resetAt),
  };
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(req: Request): string | null {
  // Check common proxy headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return null;
}
