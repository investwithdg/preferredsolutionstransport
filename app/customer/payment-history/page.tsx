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

  return <PaymentHistoryClient />;
}
