import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const supabase = createServiceRoleClient();
    const eventType = payload?.event_type || 'external_event';
    const orderId = payload?.order_id || null;

    await supabase.from('dispatch_events').insert({
      order_id: orderId,
      actor: 'make.com',
      event_type: eventType,
      source: 'make',
      event_id: payload?.event_id || undefined,
      payload,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Inbound notification error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

