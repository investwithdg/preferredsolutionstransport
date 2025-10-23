import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    const { generateDemoOrders } = await import('@/app/demo/demoData');
    const orders = generateDemoOrders();

    const users = [
      { id: 'demo-admin-1', email: 'admin@demo.com', role: 'admin', created_at: new Date().toISOString() },
      { id: 'demo-dispatcher-1', email: 'dispatcher@demo.com', role: 'dispatcher', created_at: new Date().toISOString() },
      { id: 'demo-driver-1', email: 'driver@demo.com', role: 'driver', created_at: new Date().toISOString() },
      { id: 'demo-recipient-1', email: 'customer@demo.com', role: 'recipient', created_at: new Date().toISOString() },
    ];

    const drivers = [
      { id: 'demo-driver-1', name: 'John Smith', phone: '(555) 555-0101', vehicle_details: 'Van', created_at: new Date().toISOString(), orders: [{ id: 'x', status: 'Assigned' }] },
      { id: 'demo-driver-2', name: 'Sarah Johnson', phone: '(555) 555-0102', vehicle_details: 'Truck', created_at: new Date().toISOString(), orders: [] },
      { id: 'demo-driver-3', name: 'Mike Davis', phone: '(555) 555-0103', vehicle_details: 'SUV', created_at: new Date().toISOString(), orders: [] },
    ];

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.price_total || 0), 0),
      activeOrders: orders.filter(o => !['Delivered', 'Canceled'].includes(o.status)).length,
      totalDrivers: drivers.length,
      totalUsers: users.length,
    };

    return (
      <AdminClient
        initialUsers={users as any}
        initialDrivers={drivers as any}
        initialOrders={orders as any}
        stats={stats}
      />
    );
  }

  const cookieClient = await createServerClient();
  const {
    data: { session },
  } = await cookieClient.auth.getSession();
  
  if (!session) {
    return null;
  }

  const supabase = createServiceRoleClient();

  // Fetch users with roles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch all drivers
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select(`
      *,
      orders:orders!driver_id (
        id,
        status
      )
    `)
    .order('created_at', { ascending: false });

  // Fetch order statistics
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      price_total,
      created_at,
      customers (name, email),
      drivers (name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate statistics
  const stats = {
    totalOrders: orders?.length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + (order.price_total || 0), 0) || 0,
    activeOrders: orders?.filter(o => !['Delivered', 'Canceled'].includes(o.status)).length || 0,
    totalDrivers: drivers?.length || 0,
    totalUsers: users?.length || 0,
  };

  if (usersError) console.error('Error fetching users:', usersError);
  if (driversError) console.error('Error fetching drivers:', driversError);
  if (ordersError) console.error('Error fetching orders:', ordersError);

  return (
    <AdminClient
      initialUsers={(users as any) || []}
      initialDrivers={(drivers as any) || []}
      initialOrders={(orders as any) || []}
      stats={stats}
    />
  );
}
