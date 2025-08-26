import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // Get all drivers with their current order count
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select(`
        *,
        orders:orders!driver_id (
          id,
          status
        )
      `)
      .order('name');

    if (error) {
      console.error('Drivers lookup error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch drivers' },
        { status: 500 }
      );
    }

    // Transform the data to include active order counts
    const driversWithStats = drivers.map(driver => {
      const activeOrders = driver.orders?.filter(order => 
        !['Delivered', 'Canceled'].includes(order.status)
      ) || [];
      
      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicle_details: driver.vehicle_details,
        created_at: driver.created_at,
        active_orders_count: activeOrders.length,
        is_available: activeOrders.length === 0 // Simple availability logic
      };
    });

    return NextResponse.json({
      drivers: driversWithStats
    });

  } catch (error) {
    console.error('Drivers API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, phone, vehicle_details } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Driver name is required' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // For now, we'll create drivers without authentication
    // In a production app, this would be tied to a Supabase Auth user
    const { data: driver, error } = await supabase
      .from('drivers')
      .insert({
        // user_id will be null for now - we'll add proper auth later
        name,
        phone: phone || null,
        vehicle_details: vehicle_details || null
      })
      .select()
      .single();

    if (error) {
      console.error('Driver creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create driver' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Driver created successfully',
      driver
    });

  } catch (error) {
    console.error('Driver creation API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
