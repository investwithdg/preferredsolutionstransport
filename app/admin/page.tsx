import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  // Fetch users with roles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch all drivers
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select(
      `
      *,
      orders:orders!driver_id (
        id,
        status
      )
    `
    )
    .order('created_at', { ascending: false });

  // Fetch order statistics
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      price_total,
      created_at,
      customers (name, email),
      drivers (name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate statistics
  const stats = {
    totalOrders: orders?.length || 0,
    totalRevenue: orders?.reduce((sum, order) => sum + (order.price_total || 0), 0) || 0,
    activeOrders: orders?.filter((o) => !['Delivered', 'Canceled'].includes(o.status)).length || 0,
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
