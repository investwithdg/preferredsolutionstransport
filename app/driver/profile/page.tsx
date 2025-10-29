import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DriverProfileClient from './DriverProfileClient';

export default async function DriverProfilePage() {
  const supabase = await createServerClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/sign-in');
  }

  // Get driver info
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select(`
      *,
      orders:orders!driver_id (
        id,
        status,
        created_at,
        price_total
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (driverError || !driver) {
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

  const isAvailable = driver.orders.every((o: any) => ['Delivered', 'Canceled'].includes(o.status));
  const driverWithAvailability = { ...driver, is_available: isAvailable };

  const totalDeliveries = driverWithAvailability.orders.filter((o: any) => o.status === 'Delivered').length;
  const totalEarnings = driverWithAvailability.orders
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


