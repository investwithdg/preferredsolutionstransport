import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';
import { Client } from '@hubspot/api-client';
import { syncOrderToHubSpot } from '@/lib/hubspot/client';
import type { OrderSyncData } from '@/lib/hubspot/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/sync-hubspot
 * Manually sync an order to HubSpot (for dispatchers/admins)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieClient = await createServerClient();

    // Verify authenticated user
    const {
      data: { session },
    } = await cookieClient.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is dispatcher or admin
    const { data: userRole } = await cookieClient
      .from('users')
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    if (!userRole || !['admin', 'dispatcher'].includes(userRole.role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Dispatcher role required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Check HubSpot configuration
    if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
      return NextResponse.json(
        { error: 'HubSpot not configured', message: 'HUBSPOT_PRIVATE_APP_TOKEN not set' },
        { status: 503 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch order with all related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `
        id,
        price_total,
        currency,
        status,
        hubspot_deal_id,
        created_at,
        customers (
          id,
          email,
          name,
          phone,
          hubspot_contact_id
        ),
        quotes (
          pickup_address,
          dropoff_address,
          distance_mi
        ),
        drivers (
          name,
          phone,
          vehicle_details
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json(
        { error: 'Order not found', details: orderError?.message },
        { status: 404 }
      );
    }

    // Build OrderSyncData from order
    const orderSyncData: OrderSyncData = {
      orderId: (order as any).id,
      customerId: (order as any).customers?.id || '',
      customerEmail: (order as any).customers?.email || '',
      customerName: (order as any).customers?.name || 'Unknown Customer',
      customerPhone: (order as any).customers?.phone || undefined,
      priceTotal: (order as any).price_total,
      currency: (order as any).currency || 'usd',
      status: (order as any).status,
      createdAt: new Date((order as any).created_at),
      pickupAddress: (order as any).quotes?.pickup_address,
      dropoffAddress: (order as any).quotes?.dropoff_address,
      distanceMiles: (order as any).quotes?.distance_mi,
      driverName: (order as any).drivers?.name,
      driverPhone: (order as any).drivers?.phone,
      vehicleType: (order as any).drivers?.vehicle_details?.make || undefined,
      deliveryRoute:
        (order as any).quotes?.pickup_address && (order as any).quotes?.dropoff_address
          ? `${(order as any).quotes.pickup_address} → ${(order as any).quotes.dropoff_address}`
          : undefined,
    };

    // Initialize HubSpot client
    const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN });

    // Perform sync
    const result = await syncOrderToHubSpot(
      hubspotClient,
      orderSyncData,
      (order as any).hubspot_deal_id || undefined,
      supabase
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Order synced to HubSpot successfully',
        dealId: result.dealId,
        contactId: result.contactId,
        warnings: result.warnings,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to sync to HubSpot',
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/orders/sync-hubspot:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
