import { createServiceRoleClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TrackingClient from './TrackingClient';

export default async function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const supabase = createServiceRoleClient();

  // Fetch order with all related data
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      quotes (*),
      drivers (*)
    `)
    .eq('id', params.orderId)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch order history/events
  const { data: events } = await supabase
    .from('dispatch_events')
    .select('*')
    .eq('order_id', params.orderId)
    .order('created_at', { ascending: true });

  return <TrackingClient order={order} events={events || []} />;
}
