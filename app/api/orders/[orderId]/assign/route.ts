// Using Web Request/Response to avoid type dependency on next/server
import { z } from 'zod';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { postToMake } from '@/lib/notifications';

const assignSchema = z.object({
  driverId: z.string().uuid(),
});

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { driverId } = parsed.data;

  // Require authenticated dispatcher
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const { data: dispatcher } = await supabase
    .from('dispatchers')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!dispatcher) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  // Use regular client (RLS allows dispatchers to update orders)
  const client = supabase;

  // Verify order ReadyForDispatch
  const { data: order, error: orderError } = await client
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();
  if (orderError || !order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (order.status !== 'ReadyForDispatch') {
    return new Response(JSON.stringify({ error: 'Order is not ready for dispatch' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Verify driver exists
  const { data: driver, error: driverError } = await client
    .from('drivers')
    .select('id, name, phone')
    .eq('id', driverId)
    .single();
  if (driverError || !driver) return new Response(JSON.stringify({ error: 'Driver not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  // Update assignment and status
  const { data: updated, error: updateError } = await client
    .from('orders')
    .update({ driver_id: driverId, status: 'Assigned' })
    .eq('id', orderId)
    .select('*, customers (id, name, email, phone), quotes (pickup_address, dropoff_address, distance_mi), drivers (id, name, phone)')
    .single();
  if (updateError) return new Response(JSON.stringify({ error: 'Failed to assign driver' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Log dispatch event (use service role to bypass any constraints on insert)
  const svc = createServiceRoleClient();
  await svc.from('dispatch_events').insert({
    order_id: orderId,
    actor: dispatcher.name || 'dispatcher',
    event_type: 'driver_assigned',
    source: 'dispatcher_ui',
    event_id: `assign_${orderId}_${driverId}`,
    payload: { order_id: orderId, driver_id: driverId },
  });

  // Notify Make.com
  await postToMake({
    eventType: 'driver_assigned',
    data: {
      order_id: orderId,
      driver_id: driverId,
      driver_name: driver.name,
    },
  });

  return new Response(JSON.stringify({ message: 'Driver assigned', order: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

