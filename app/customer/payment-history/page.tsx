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

  // Verify user is a customer/recipient
  const { data: userRole } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', session.user.id)
    .single();

  if (userRole?.role !== 'recipient' && userRole?.role !== 'admin') {
    redirect('/');
  }

  return <PaymentHistoryClient />;
}
