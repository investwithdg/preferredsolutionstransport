import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { uploadProofOfDelivery, getProofOfDelivery } from '@/lib/proof-of-delivery/storage';
import { syncOrderToHubSpot } from '@/lib/hubspot/client';

/**
 * GET /api/orders/[orderId]/proof-of-delivery
 * Retrieve proof of delivery for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createServerClient();

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
    const supabase = createServerClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get driver ID from user
    const { data: driver, error: driverError } = await supabase
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
    const { data: order, error: orderError } = await supabase
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

    if (order.driver_id !== driver.id) {
      return NextResponse.json(
        { error: 'Order not assigned to this driver' },
        { status: 403 }
      );
    }

    // Check if PoD already exists
    const { data: existingPod } = await supabase
      .from('delivery_proof')
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
    const { error: updateError } = await supabase
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

    // Sync to HubSpot if deal ID exists
    if (order.hubspot_deal_id) {
      try {
        const { data: orderDetails } = await supabase
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
          await syncOrderToHubSpot(
            {
              orderId: orderDetails.id,
              customerEmail: orderDetails.customers?.email || '',
              customerName: orderDetails.customers?.name || '',
              customerPhone: orderDetails.customers?.phone || '',
              priceTotal: orderDetails.price_total,
              status: 'Delivered',
              pickupAddress: orderDetails.quotes?.pickup_address,
              dropoffAddress: orderDetails.quotes?.dropoff_address,
              distanceMiles: orderDetails.quotes?.distance_mi,
              driverName: orderDetails.drivers?.name,
              driverPhone: orderDetails.drivers?.phone,
            },
            order.hubspot_deal_id
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

