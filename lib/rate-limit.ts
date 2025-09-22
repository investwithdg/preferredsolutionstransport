// Rate limiting utilities
// Uses database-backed rate limiting for production accuracy
// Falls back to no-op if database is unavailable

import { createServiceRoleClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/config';

const RATE_LIMITS = {
  quote: { limit: 10, windowMinutes: 60 }, // 10 quotes per hour
  checkout: { limit: 5, windowMinutes: 30 }, // 5 checkouts per 30 minutes
  default: { limit: 100, windowMinutes: 60 }, // Default rate limit
};

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  customLimit?: number,
  customWindowMinutes?: number
): Promise<void> {
  // Skip rate limiting in development or if feature flag is disabled
  if (process.env.NODE_ENV === 'development' || process.env.FEATURE_RATE_LIMITING !== 'true') {
    return;
  }

  const supabase = createServiceRoleClient();

  // Get rate limit configuration
  const config = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const limit = customLimit || config.limit;
  const windowMinutes = customWindowMinutes || config.windowMinutes;

  try {
    // Call the database function to check rate limit
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_limit: limit,
        p_window_minutes: windowMinutes,
      });

    if (error) {
      console.warn('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting fails
      return;
    }

    if (!data) {
      throw new AppError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }
  } catch (error) {
    console.warn('Rate limit check error:', error);
    // Fail open - allow request if rate limiting fails
    return;
  }
}

// Helper to get client identifier (IP address)
export function getClientIdentifier(request: Request): string {
  // In production, use the actual IP address
  // For now, use a simple fallback
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwarded ? forwarded.split(',')[0] : realIp || 'unknown';

  return clientIp;
}

// Rate limiting middleware factory
export function withRateLimit(handler: Function, endpoint: string) {
  return async (request: Request, ...args: any[]) => {
    const clientId = getClientIdentifier(request);

    try {
      await checkRateLimit(clientId, endpoint);
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 429) {
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60', // Retry after 1 minute
            },
          }
        );
      }
      throw error;
    }
  };
}