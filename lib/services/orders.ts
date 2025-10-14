import { createServiceRoleClient } from '@/lib/supabase/server';

export async function getOrdersByDriverId(driverId: string) {
  const supabase = createServiceRoleClient();

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
    throw error;
  }

  return orders || [];
}


