import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PaymentHistoryClient from './PaymentHistoryClient';

export default async function PaymentHistoryPage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  const { data: payments, error } = await supabase
    .from('payment_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment history:', error);
    // Handle error appropriately
  }

  return <PaymentHistoryClient payments={payments || []} />;
}
