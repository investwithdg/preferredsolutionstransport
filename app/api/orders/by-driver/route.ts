import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const byDriverSchema = z.object({
  driverId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { driverId } = byDriverSchema.parse(body);

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get orders assigned to this driver
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, email, phone),
        quotes (pickup_address, dropoff_address, distance_mi),
        drivers (id, name, phone)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders lookup error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders: orders || []
    });

  } catch (error) {
    console.error('Orders by driver API error:', error);
    
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
