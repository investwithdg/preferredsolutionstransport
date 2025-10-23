import { NextRequest, NextResponse } from 'next/server';
import { upsertDriverPushSubscription } from '@/lib/services/drivers';
import { http } from '@/lib/utils';
import { z } from 'zod';
import { driverPushSubscriptionSchema } from '@/lib/validations';

const subscriptionSchema = driverPushSubscriptionSchema;

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('Received push subscription request:', JSON.stringify(requestBody, null, 2));
    
    const { driverId, subscription } = subscriptionSchema.parse(requestBody);

    // In demo mode, don't save to the database, just return success
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && driverId.startsWith('demo-')) {
      console.log(`Demo mode: Bypassing database for push subscription for ${driverId}`);
      const { body: responseBody, init } = http.ok({ success: true, demo: true });
      return NextResponse.json(responseBody, init);
    }

    await upsertDriverPushSubscription(driverId, subscription);
    const { body: responseBody, init } = http.ok({ success: true });
    return NextResponse.json(responseBody, init);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Push subscription validation error:', error.errors);
      const { body, init } = http.badRequest('Invalid request data', error.errors);
      return NextResponse.json(body, init);
    }

    console.error('Unexpected error saving push subscription:', error);
    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}
