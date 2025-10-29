import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/health/database
 * Database metrics and health statistics
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

    const supabase = createServiceRoleClient();

    // Get table row counts
    const [
      customersCount,
      ordersCount,
      driversCount,
      quotesCount,
      usersCount,
      dispatchEventsCount,
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('drivers').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('dispatch_events').select('*', { count: 'exact', head: true }),
    ]);

    // Get recent activity
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: recentEvents } = await supabase
      .from('dispatch_events')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    // Get order status distribution
    const { data: orderStatuses } = await supabase.from('orders').select('status');

    const statusCounts =
      orderStatuses?.reduce((acc: Record<string, number>, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tables: {
        customers: customersCount.count || 0,
        orders: ordersCount.count || 0,
        drivers: driversCount.count || 0,
        quotes: quotesCount.count || 0,
        users: usersCount.count || 0,
        dispatch_events: dispatchEventsCount.count || 0,
      },
      activity: {
        lastOrderCreated: recentOrders?.[0]?.created_at || null,
        lastEventLogged: recentEvents?.[0]?.created_at || null,
      },
      orderStatusDistribution: statusCounts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/health/database:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Failed to fetch database metrics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
