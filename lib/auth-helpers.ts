export function getBaseUrl(): string {
  // Prefer explicit production URL when defined
  const prodUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (prodUrl) {
    return prodUrl.replace(/\/$/, ''); // remove trailing slash
  }

  // Vercel automatically exposes VERCEL_URL (without protocol) for preview & prod
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel.replace(/\/$/, '')}`;
  }

  // Fallback to localhost for local development
  return 'http://localhost:3000';
}

/**
 * Returns a fully-qualified URL for use as Supabase redirectTo/emailRedirectTo.
 * Safe to call in both browser and server environments.
 */
export function getAuthRedirectUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('getAuthRedirectUrl: path must start with "/"');
  }

  // Browser environment: use window.location.origin unless overridden
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    return `${origin}${path}`;
  }

  // Server-side (API routes, Next.js RSC): use getBaseUrl()
  return `${getBaseUrl()}${path}`;
}

/**
 * Convenience helper specifically for /auth/callback route.
 */
export const getCallbackRedirectUrl = (roleOrQuery: string) =>
  `${getAuthRedirectUrl('/auth/callback')}${roleOrQuery}`;
