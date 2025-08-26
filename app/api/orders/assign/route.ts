import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const assignDriverSchema = z.object({
  orderId: z.string().uuid(),
  driverId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { orderId, driverId } = assignDriverSchema.parse(body);

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Verify the order exists and is in the correct status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow assignment for orders that are ReadyForDispatch
    if (order.status !== 'ReadyForDispatch') {
      return NextResponse.json(
        { error: 'Order is not ready for dispatch' },
        { status: 400 }
      );
    }

    // Verify the driver exists
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name')
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error('Driver lookup error:', driverError);
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // Assign the driver to the order and update status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        driver_id: driverId,
        status: 'Assigned',
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
      console.error('Order assignment error:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign driver to order' },
        { status: 500 }
      );
    }

    // Log the assignment event
    const { error: eventError } = await supabase
      .from('dispatch_events')
      .insert({
        order_id: orderId,
        actor: 'dispatcher', // In a future milestone, this would be the actual dispatcher's ID
        event_type: 'driver_assigned',
        payload: {
          driver_id: driverId,
          driver_name: driver.name,
          previous_status: 'ReadyForDispatch',
          new_status: 'Assigned'
        },
        source: 'dispatcher_ui',
        event_id: `assign_${orderId}_${driverId}_${Date.now()}`
      });

    if (eventError) {
      // Log the error but don't fail the request
      console.error('Failed to log assignment event:', eventError);
    }

    return NextResponse.json({
      message: 'Driver assigned successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Driver assignment API error:', error);
    
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
