import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const requestSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  email: z
    .string()
    .email()
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, email } = requestSchema.parse(body);

    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        customers ( email )
      `
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const customerEmail = (order.customers as { email?: string } | null)?.email;
    if (email && customerEmail && customerEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match our records for this order' },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[Track Verify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
