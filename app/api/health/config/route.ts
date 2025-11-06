import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Diagnostic endpoint to check environment configuration
 * Useful for debugging deployment issues
 */
export async function GET() {
  const checks = {
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL ? '✓ Set' : '✗ Missing',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ? '✓ Set' : '✗ Missing',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL ? '✓ Set' : '✗ Missing',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✓ Set' : '✗ Missing',
    hubspotToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN ? '✓ Set' : '✗ Missing',
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✓ Set' : '✗ Missing',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? '✓ Set' : '✗ Missing',
  };

  // Check if critical variables are missing
  const critical = ['supabaseUrl', 'supabaseAnonKey', 'supabaseServiceKey'];

  const missingCritical = critical.filter(
    (key) => checks[key as keyof typeof checks] === '✗ Missing'
  );

  const status = missingCritical.length === 0 ? 'healthy' : 'misconfigured';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
      missingCritical: missingCritical.length > 0 ? missingCritical : undefined,
      warnings:
        status === 'misconfigured'
          ? [
              'Critical environment variables are missing. Please check your Vercel environment settings.',
            ]
          : undefined,
    },
    {
      status: status === 'healthy' ? 200 : 500,
    }
  );
}
