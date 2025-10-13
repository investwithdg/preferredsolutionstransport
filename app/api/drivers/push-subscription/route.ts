import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscriptionSchema = z.object({
  driverId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }).nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, subscription } = subscriptionSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Update the driver's push subscription
    const { error } = await supabase
      .from('drivers')
      .update({ push_subscription: subscription })
      .eq('id', driverId);

    if (error) {
      console.error('Error updating push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to update push subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
