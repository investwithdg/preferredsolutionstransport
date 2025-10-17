import { NextRequest, NextResponse } from 'next/server';
import { upsertDriverPushSubscription } from '@/lib/services/drivers';
import { http } from '@/lib/utils';
import { z } from 'zod';
import { driverPushSubscriptionSchema } from '@/lib/validations';

const subscriptionSchema = driverPushSubscriptionSchema;

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { driverId, subscription } = subscriptionSchema.parse(requestBody);

    await upsertDriverPushSubscription(driverId, subscription);
    const { body: responseBody, init } = http.ok({ success: true });
    return NextResponse.json(responseBody, init);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { body, init } = http.badRequest('Invalid request data', error.errors);
      return NextResponse.json(body, init);
    }

    console.error('Unexpected error:', error);
    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}
