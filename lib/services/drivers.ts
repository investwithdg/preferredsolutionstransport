import { createServiceRoleClient } from '@/lib/supabase/server';

export async function listDriversWithStats() {
  const supabase = createServiceRoleClient();
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

  if (error) throw error;

  return (drivers || []).map(driver => {
    const activeOrders = (driver as any).orders?.filter((o: any) => !['Delivered', 'Canceled'].includes(o.status)) || [];
    return {
      id: (driver as any).id,
      name: (driver as any).name,
      phone: (driver as any).phone,
      vehicle_details: (driver as any).vehicle_details,
      created_at: (driver as any).created_at,
      active_orders_count: activeOrders.length,
      is_available: activeOrders.length === 0,
    };
  });
}

export async function createDriver(input: { name: string; phone?: string; vehicle_details?: any }) {
  const supabase = createServiceRoleClient();
  const { data: driver, error } = await supabase
    .from('drivers')
    .insert({
      name: input.name,
      phone: input.phone || null,
      vehicle_details: input.vehicle_details || null,
    })
    .select()
    .single();

  if (error) throw error;
  return driver;
}

export async function upsertDriverPushSubscription(driverId: string, subscription: any | null) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('drivers')
    .update({ push_subscription: subscription })
    .eq('id', driverId);
  if (error) throw error;
}


