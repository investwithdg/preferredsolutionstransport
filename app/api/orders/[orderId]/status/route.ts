import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Canceled']),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    
    // Validate input
    const { status, notes } = updateStatusSchema.parse(body);

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get the current order with driver info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        drivers (id, name, user_id),
        customers (id, name, email),
        quotes (pickup_address, dropoff_address, distance_mi)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // In a production app, we would verify that the authenticated user
    // is the driver assigned to this order. For now, we'll skip auth.
    // TODO: Add proper driver authentication in a future milestone

    // Update the order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select(`
        *,
        drivers (id, name, phone),
        customers (id, name, email),
        quotes (pickup_address, dropoff_address, distance_mi)
      `)
      .single();

    if (updateError) {
      console.error('Order status update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Log the status change event
    const { error: eventError } = await supabase
      .from('dispatch_events')
      .insert({
        order_id: orderId,
        actor: order.drivers?.name || 'driver', // In production, this would be the authenticated driver's name
        event_type: 'status_updated',
        payload: {
          previous_status: order.status,
          new_status: status,
          notes: notes || null,
          driver_id: order.driver_id
        },
        source: 'driver_app',
        event_id: `status_${orderId}_${status}_${Date.now()}`
      });

    if (eventError) {
      // Log the error but don't fail the request
      console.error('Failed to log status change event:', eventError);
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Order status update API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
