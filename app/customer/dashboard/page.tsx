import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CustomerDashboardClient from './CustomerDashboardClient';

export default async function CustomerDashboardPage() {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  // Get customer by auth user email
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('email', session.user.email!)
    .single();

  if (!customer) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900">No Orders Found</h2>
          <p className="text-yellow-700 mt-2">
            You haven&apos;t placed any orders yet. Start by requesting a quote!
          </p>
        </div>
      </div>
    );
  }

  // Fetch customer's orders
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      quotes (*),
      drivers (name, phone)
    `)
    .eq('customer_id', (customer as any).id)
    .order('created_at', { ascending: false });

  return (
    <CustomerDashboardClient
      customer={customer}
      orders={orders || []}
    />
  );
}
