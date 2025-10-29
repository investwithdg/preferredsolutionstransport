import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { uploadProofOfDelivery, getProofOfDelivery } from '@/lib/proof-of-delivery/storage';
import { createHubSpotClient, syncOrderToHubSpot } from '@/lib/hubspot/client';
import type { OrderSyncData } from '@/lib/hubspot/types';

/**
 * GET /api/orders/[orderId]/proof-of-delivery
 * Retrieve proof of delivery for an order
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orderId } = params;

    // Get proof of delivery
    const pod = await getProofOfDelivery(orderId);

    if (!pod) {
      return NextResponse.json(
        { error: 'Proof of delivery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pod });
  } catch (error) {
    console.error('Error fetching PoD:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proof of delivery' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[orderId]/proof-of-delivery
 * Submit proof of delivery and mark order as delivered
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createServerClient();
    const supabaseClient = supabase as any;
    const serviceSupabase = createServiceRoleClient();
    const serviceClient = serviceSupabase as any;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get driver ID from user
    const { data: driver, error: driverError } = await supabaseClient
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 403 }
      );
    }

    const { orderId } = params;

    // Parse form data
    const formData = await request.formData();
    const photos: Blob[] = [];
    let signature: Blob | null = null;
    let notes = '';
    let recipientName = '';

    // Extract photos
    for (let i = 0; i < 3; i++) {
      const photo = formData.get(`photo_${i}`);
      if (photo instanceof Blob) {
        photos.push(photo);
      }
    }

    // Extract signature
    const signatureFile = formData.get('signature');
    if (signatureFile instanceof Blob) {
      signature = signatureFile;
    }

    // Extract text fields
    notes = (formData.get('notes') as string) || '';
    recipientName = (formData.get('recipientName') as string) || '';

    // Validate
    if (photos.length === 0 && !signature) {
      return NextResponse.json(
        { error: 'At least one photo or signature is required' },
        { status: 400 }
      );
    }

    if (!recipientName.trim()) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    // Verify order exists and is assigned to this driver
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, driver_id, status, customer_id, hubspot_deal_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const existingDealId = (order as any).hubspot_deal_id || undefined;

    if (order.driver_id !== driver.id) {
      return NextResponse.json(
        { error: 'Order not assigned to this driver' },
        { status: 403 }
      );
    }

    // Check if PoD already exists
    const { data: existingPod } = await supabaseClient
      .from('delivery_proof' as any)
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingPod) {
      return NextResponse.json(
        { error: 'Proof of delivery already submitted' },
        { status: 400 }
      );
    }

    // Upload proof of delivery
    const result = await uploadProofOfDelivery({
      orderId,
      driverId: driver.id,
      photos,
      signature,
      notes,
      recipientName
    });

    // Update order status to Delivered
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        status: 'Delivered',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      // Don't fail the request - PoD is already saved
    }

    // Sync to HubSpot
    const hubspotClient = createHubSpotClient();
    if (hubspotClient) {
      try {
        const { data: orderDetails } = await serviceClient
          .from('orders')
          .select(`
            *,
            customers (id, name, email, phone),
            quotes (pickup_address, dropoff_address, distance_mi),
            drivers (name, phone)
          `)
          .eq('id', orderId)
          .single();

        if (orderDetails) {
          const metadata = (orderDetails as any).hubspot_metadata || {};
          const orderSyncData: OrderSyncData = {
            orderId: orderDetails.id,
            customerId: orderDetails.customer_id || order.customer_id || '',
            customerEmail: orderDetails.customers?.email || '',
            customerName: orderDetails.customers?.name || undefined,
            customerPhone: orderDetails.customers?.phone || undefined,
            priceTotal: orderDetails.price_total || 0,
            currency: orderDetails.currency || 'usd',
            status: 'Delivered',
            pickupAddress: orderDetails.quotes?.pickup_address || undefined,
            dropoffAddress: orderDetails.quotes?.dropoff_address || undefined,
            distanceMiles: orderDetails.quotes?.distance_mi || undefined,
            driverId: orderDetails.driver_id || undefined,
            driverName: orderDetails.drivers?.name || undefined,
            driverPhone: orderDetails.drivers?.phone || undefined,
            createdAt: new Date(orderDetails.created_at || new Date().toISOString()),
            updatedAt: new Date(),
            actualDeliveryTime: new Date(),
            deliveryRoute: metadata?.deliveryRoute || (orderDetails.quotes?.pickup_address && orderDetails.quotes?.dropoff_address
              ? `${orderDetails.quotes.pickup_address} → ${orderDetails.quotes.dropoff_address}`
              : undefined),
            deliveryLocation: metadata?.deliveryLocation || orderDetails.quotes?.dropoff_address || undefined,
            deliveryType: metadata?.deliveryType || undefined,
            weightBracket: metadata?.weightBracket || undefined,
            specialDeliveryInstructions: metadata?.specialDeliveryInstructions || (orderDetails.quotes as any)?.special_instructions || undefined,
            quoteSource: metadata?.quoteSource || undefined,
            recurringFrequency: metadata?.recurringFrequency || undefined,
            rushRequested: typeof metadata?.rushRequested === 'boolean' ? metadata.rushRequested : undefined,
            servicesProposed: metadata?.servicesProposed || undefined,
            snapshotAuditSent: metadata?.snapshotAuditSent || undefined,
          };

          await syncOrderToHubSpot(
            hubspotClient,
            orderSyncData,
            existingDealId,
            serviceSupabase
          );
        }
      } catch (syncError) {
        console.error('Failed to sync to HubSpot:', syncError);
        // Don't fail the request - PoD is saved and order is updated
      }
    }

    return NextResponse.json({
      success: true,
      pod: {
        id: result.id,
        photoUrls: result.photoUrls,
        signatureUrl: result.signatureUrl
      }
    });
  } catch (error) {
    console.error('Error submitting PoD:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit proof of delivery',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

