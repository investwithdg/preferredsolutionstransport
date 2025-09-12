// Using Web types to avoid dependency on next/server types in lint
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { postToMake } from '@/lib/notifications';

const updateStatusSchema = z.object({
  status: z.enum(['Accepted', 'PickedUp', 'InTransit', 'Delivered', 'Canceled']),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    
    // Validate input
    const { status, notes } = updateStatusSchema.parse(body);

    // Use service role for demo mode; RLS guards are enforced via triggers
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

    // In a future milestone, this will verify authenticated driver/dispatcher

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

    // Log the status change event (via service role to ensure append-only bypass)
    const { error: eventError } = await supabase
      .from('dispatch_events')
      .insert({
        order_id: orderId,
        actor: order.drivers?.name || 'driver',
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

    // Notify Make.com on key statuses
    if (status === 'PickedUp') {
      await postToMake({
        eventType: 'order_picked_up',
        data: { order_id: orderId, driver_id: order.driver_id },
      });
    }

    return NextResponse.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error: unknown) {
    console.error('Order status update API error:', error);
    
    if (error && typeof error === 'object' && 'errors' in (error as any)) {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as any).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
