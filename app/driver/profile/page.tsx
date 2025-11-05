import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DriverProfileClient from './DriverProfileClient';

export default async function DriverProfilePage() {
  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  const { data: driverWithOrders, error } = await supabase
    .from('drivers')
    .select(
      `
      *,
      orders:orders!driver_id (
        id,
        status,
        created_at,
        price_total
      )
    `
    )
    .eq('user_id', session.user.id)
    .single();

  if (error || !driverWithOrders) {
    return (
      <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <h1 className="text-heading-lg font-semibold mb-4">Driver Not Found</h1>
          <p className="text-muted-foreground">
            No driver profile found for this account.
          </p>
        </div>
      </div>
    );
  }

  const orders = (driverWithOrders as any).orders || [];
  const isAvailable = orders.every((o: any) => ['Delivered', 'Canceled'].includes(o.status));
  const driverWithAvailability = {
    ...driverWithOrders,
    is_available: isAvailable,
  } as any;

  const totalDeliveries = orders.filter((o: any) => o.status === 'Delivered').length;
  const totalEarnings = orders
    .filter((o: any) => o.status === 'Delivered')
    .reduce((sum: number, o: any) => sum + (o.price_total || 0), 0);

  return (
    <DriverProfileClient
      driver={driverWithAvailability}
      totalDeliveries={totalDeliveries}
      totalEarnings={totalEarnings}
    />
  );
}


