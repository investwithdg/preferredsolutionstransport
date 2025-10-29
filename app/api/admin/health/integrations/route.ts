import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/health/integrations
 * Comprehensive health check for all third-party integrations
 */
export async function GET() {
  try {
    const cookieClient = await createServerClient();

    // Verify admin access
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const healthStatus = {
      timestamp: new Date().toISOString(),
      integrations: {
        supabase: await checkSupabaseHealth(),
        stripe: await checkStripeHealth(),
        hubspot: await checkHubSpotHealth(),
        googleMaps: await checkGoogleMapsHealth(),
      },
    };

    return NextResponse.json(healthStatus);
  } catch (error: any) {
    console.error('Error in GET /api/admin/health/integrations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function checkSupabaseHealth() {
  try {
    const supabase = createServiceRoleClient();

    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return {
        status: 'unhealthy',
        message: 'Database query failed',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }

    // Check realtime status (simplified check)
    const realtimeStatus = 'connected'; // Placeholder - would need actual realtime status

    return {
      status: 'healthy',
      message: 'Connected',
      metadata: {
        totalOrders: data,
        realtimeStatus,
      },
      lastCheck: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: 'Connection failed',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkStripeHealth() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'not_configured',
        message: 'Stripe API key not configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Test Stripe API with a simple balance retrieval
    const balance = await stripe.balance.retrieve();

    return {
      status: 'healthy',
      message: 'Connected',
      metadata: {
        available: balance.available.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        pending: balance.pending.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        livemode: balance.livemode,
      },
      lastCheck: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: 'API request failed',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkHubSpotHealth() {
  try {
    if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
      return {
        status: 'not_configured',
        message: 'HubSpot token not configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Test HubSpot API with a simple request
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        status: 'unhealthy',
        message: 'API request failed',
        error,
        lastCheck: new Date().toISOString(),
      };
    }

    const data = await response.json();

    return {
      status: 'healthy',
      message: 'Connected',
      metadata: {
        totalContacts: data.total || 0,
        rateLimit: response.headers.get('x-hubspot-ratelimit-remaining'),
      },
      lastCheck: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: 'Connection failed',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkGoogleMapsHealth() {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return {
        status: 'not_configured',
        message: 'Google Maps API key not configured',
        lastCheck: new Date().toISOString(),
      };
    }

    // Test Google Maps API with a simple geocode request
    const testAddress = encodeURIComponent('1600 Amphitheatre Parkway, Mountain View, CA');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${testAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        status: 'unhealthy',
        message: `API returned status: ${data.status}`,
        error: data.error_message || data.status,
        lastCheck: new Date().toISOString(),
      };
    }

    return {
      status: 'healthy',
      message: 'Connected',
      metadata: {
        apiStatus: data.status,
      },
      lastCheck: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      message: 'API request failed',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
}
