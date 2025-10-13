import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const locationUpdateSchema = z.object({
  driverId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const locationData = locationUpdateSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Verify driver exists
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('id', locationData.driverId)
      .single();

    if (driverError || !driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    // If orderId is provided, verify it exists and is assigned to this driver
    if (locationData.orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, driver_id')
        .eq('id', locationData.orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      if (order.driver_id !== locationData.driverId) {
        return NextResponse.json(
          { error: 'Order not assigned to this driver' },
          { status: 403 }
        );
      }
    }

    // Insert location record
    const { data: location, error: locationError } = await (supabase as any)
      .from('driver_locations')
      .insert({
        driver_id: locationData.driverId,
        order_id: locationData.orderId || null,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy || null,
        heading: locationData.heading || null,
        speed: locationData.speed || null,
      })
      .select()
      .single();

    if (locationError) {
      console.error('Error inserting driver location:', locationError);
      return NextResponse.json(
        { error: 'Failed to record location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Location recorded successfully',
      location
    });

  } catch (error) {
    console.error('Driver location API error:', error);
    
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

/**
 * GET endpoint to fetch latest driver location
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const orderId = searchParams.get('orderId');

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Build query for latest location
    let query = (supabase as any)
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Filter by order if provided
    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error('Error fetching driver location:', error);
      return NextResponse.json(
        { error: 'Failed to fetch location' },
        { status: 500 }
      );
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json(
        { location: null, message: 'No location data available' }
      );
    }

    return NextResponse.json({ location: locations[0] });

  } catch (error) {
    console.error('Driver location GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

