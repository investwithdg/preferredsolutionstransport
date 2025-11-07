import { NextRequest, NextResponse } from 'next/server';
import { createServerClientRSC } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/unified
 *
 * Unified endpoint that returns orders with role-appropriate filtered metadata.
 * Uses the SQL view `orders_with_filtered_metadata` which automatically
 * filters HubSpot metadata based on the current user's role.
 *
 * Query parameters:
 * - status: Filter by order status
 * - driver_id: Filter by assigned driver
 * - customer_id: Filter by customer
 * - from: Start date for scheduled_delivery_time
 * - to: End date for scheduled_delivery_time
 * - limit: Number of results (default 50)
 * - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClientRSC();
    const db = supabase as any;
    const searchParams = request.nextUrl.searchParams;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user role and ID
    const { data: userData, error: userError } = await db
      .from('users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 });
    }

    if (!userData.role) {
      return NextResponse.json({ error: 'User role not assigned' }, { status: 403 });
    }

    // Build query using the filtered view
    let query = db
      .from('orders_with_filtered_metadata')
      .select(
        `
        *,
        driver:drivers!left(
          id,
          user_id,
          name,
          phone,
          vehicle_type,
          vehicle_license_plate
        ),
        customer:customers!left(
          id,
          name,
          email,
          phone,
          company
        ),
        delivery_proof:delivery_proof!left(
          id,
          signature_url,
          photo_url,
          notes,
          delivered_at,
          recipient_name
        ),
        payment_records!left(
          id,
          amount,
          status,
          payment_method,
          transaction_date
        )
      `
      )
      .order('created_at', { ascending: false });

    // Apply filters based on user role
    const role = userData.role as string;

    // Role-based default filters
    if (role === 'driver') {
      // Drivers see only their assigned orders
      const { data: driver } = await db
        .from('drivers')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (driver) {
        query = query.eq('driver_id', driver.id);
      } else {
        // Driver profile not found
        return NextResponse.json({ orders: [], total: 0 });
      }
    } else if (role === 'recipient') {
      // Customers see only their orders
      const { data: customer } = await db
        .from('customers')
        .select('id')
        .eq('auth_email', user.email)
        .single();

      if (customer) {
        query = query.eq('customer_id', customer.id);
      } else {
        // Customer not found
        return NextResponse.json({ orders: [], total: 0 });
      }
    }

    // Apply additional filters from query params
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    const driverId = searchParams.get('driver_id');
    if (driverId && (role === 'admin' || role === 'dispatcher')) {
      query = query.eq('driver_id', driverId);
    }

    const customerId = searchParams.get('customer_id');
    if (customerId && (role === 'admin' || role === 'dispatcher')) {
      query = query.eq('customer_id', customerId);
    }

    const from = searchParams.get('from');
    if (from) {
      query = query.gte('scheduled_delivery_time', from);
    }

    const to = searchParams.get('to');
    if (to) {
      query = query.lte('scheduled_delivery_time', to);
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get total count for pagination
    const countQuery = db
      .from('orders_with_filtered_metadata')
      .select('id', { count: 'exact', head: true });

    // Apply same filters to count query
    if (role === 'driver') {
      const { data: driver } = await db
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (driver) {
        countQuery.eq('driver_id', driver.id);
      }
    } else if (role === 'recipient') {
      const { data: customer } = await db
        .from('customers')
        .select('id')
        .eq('auth_email', user.email)
        .single();
      if (customer) {
        countQuery.eq('customer_id', customer.id);
      }
    }

    if (status) countQuery.eq('status', status);
    if (driverId && (role === 'admin' || role === 'dispatcher')) {
      countQuery.eq('driver_id', driverId);
    }
    if (customerId && (role === 'admin' || role === 'dispatcher')) {
      countQuery.eq('customer_id', customerId);
    }
    if (from) countQuery.gte('scheduled_delivery_time', from);
    if (to) countQuery.lte('scheduled_delivery_time', to);

    const { count } = await countQuery;

    // Execute main query with pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Format response with metadata about the user's view
    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
      metadata: {
        user_role: role,
        filtered_view: true,
        available_fields: getAvailableFieldsForRole(role),
      },
    });
  } catch (error) {
    console.error('Unified orders endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to document which fields are available to each role
 */
function getAvailableFieldsForRole(role: string) {
  const baseFields = [
    'id',
    'order_number',
    'status',
    'created_at',
    'updated_at',
    'pickup_address',
    'dropoff_address',
    'scheduled_times',
  ];

  const metadataFields: Record<string, string[]> = {
    driver: ['special_delivery_instructions'],
    recipient: ['special_delivery_instructions'],
    dispatcher: ['special_delivery_instructions', 'recurring_frequency', 'rush_requested'],
    admin: ['all_hubspot_metadata'],
  };

  return {
    operational_fields: baseFields,
    hubspot_metadata_fields: metadataFields[role] || [],
  };
}
