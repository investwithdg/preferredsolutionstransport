import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';
import DispatcherClient from './DispatcherClient';

export default async function DispatcherPage() {
  const cookieClient = createServerClient();
  const {
    data: { session },
  } = await cookieClient.auth.getSession();
  if (!session) {
    return null;
  }
  const supabase = createServiceRoleClient();

  // Fetch orders ready for dispatch
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      quotes (*)
    `)
    .eq('status', 'ReadyForDispatch')
    .order('created_at', { ascending: false });

  // Fetch available drivers
  const { data: driversData, error: driversError } = await supabase
    .from('drivers')
    .select(`
      *,
      orders:orders!driver_id (
        id,
        status
      )
    `)
    .order('name');

  // Transform the data to include active order counts
  const drivers = driversData?.map(driver => {
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
      is_available: activeOrders.length === 0
    };
  }) || [];

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
  }

  if (driversError) {
    console.error('Error fetching drivers:', driversError);
  }

  return (
    <DispatcherClient 
      initialOrders={orders || []} 
      drivers={drivers} 
    />
  );
}
