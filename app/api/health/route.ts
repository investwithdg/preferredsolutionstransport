import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { validateEnvironment } from '@/lib/config';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      database: false,
      environment: false,
      stripe: false,
      hubspot: false,
    },
    responseTime: 0,
  };

  try {
    // Check environment variables
    try {
      validateEnvironment();
      healthCheck.checks.environment = true;
    } catch (error) {
      healthCheck.checks.environment = false;
      healthCheck.status = 'error';
      console.error('Environment validation failed:', error);
    }

    // Check database connectivity
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from('dispatch_events')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }
      healthCheck.checks.database = true;
    } catch (error) {
      healthCheck.checks.database = false;
      healthCheck.status = 'error';
      console.error('Database connectivity failed:', error);
    }

    // Check Stripe connectivity (basic check)
    try {
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      if (stripeSecret && stripeSecret.startsWith('sk_')) {
        healthCheck.checks.stripe = true;
      } else {
        healthCheck.checks.stripe = false;
      }
    } catch (error) {
      healthCheck.checks.stripe = false;
      console.error('Stripe configuration check failed:', error);
    }

    // Check HubSpot connectivity (basic check)
    try {
      const hubspotToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
      if (hubspotToken && hubspotToken.startsWith('pat-na1-')) {
        healthCheck.checks.hubspot = true;
      } else {
        healthCheck.checks.hubspot = false;
      }
    } catch (error) {
      healthCheck.checks.hubspot = false;
      console.error('HubSpot configuration check failed:', error);
    }

    // Calculate response time
    healthCheck.responseTime = Date.now() - startTime;

    // Determine overall status
    const allChecks = Object.values(healthCheck.checks);
    if (allChecks.includes(false)) {
      healthCheck.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'ok' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    healthCheck.status = 'error';
    healthCheck.responseTime = Date.now() - startTime;

    return NextResponse.json(healthCheck, { status: 503 });
  }
}

// Allow health checks to bypass rate limiting
export const dynamic = 'force-dynamic';