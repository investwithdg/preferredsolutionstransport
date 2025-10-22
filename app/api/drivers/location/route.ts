import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { http } from '@/lib/utils';
import { z } from 'zod';
import { driverLocationUpdateSchema } from '@/lib/validations';

const locationUpdateSchema = driverLocationUpdateSchema;

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
      const { body: errorBody, init } = http.notFound('Driver not found');
      return NextResponse.json(errorBody, init);
    }

    // If orderId is provided, verify it exists and is assigned to this driver
    if (locationData.orderId) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, driver_id')
        .eq('id', locationData.orderId)
        .single();

      if (orderError || !order) {
        const { body: errorBody, init } = http.notFound('Order not found');
        return NextResponse.json(errorBody, init);
      }

      if (order.driver_id !== locationData.driverId) {
        return NextResponse.json({ error: 'Order not assigned to this driver' }, { status: 403 });
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
      const { body: errorBody, init } = http.serverError('Failed to record location');
      return NextResponse.json(errorBody, init);
    }

    const { body: responseBody, init } = http.ok({ message: 'Location recorded successfully', location });
    return NextResponse.json(responseBody, init);

  } catch (error) {
    console.error('Driver location API error:', error);
    
    if (error instanceof z.ZodError) {
      const { body, init } = http.badRequest('Invalid input data', error.errors);
      return NextResponse.json(body, init);
    }

    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
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
      const { body, init } = http.badRequest('driverId is required');
      return NextResponse.json(body, init);
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
      const { body, init } = http.serverError('Failed to fetch location');
      return NextResponse.json(body, init);
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ location: null, message: 'No location data available' });
    }

    return NextResponse.json({ location: locations[0] });

  } catch (error) {
    console.error('Driver location GET API error:', error);
    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}

