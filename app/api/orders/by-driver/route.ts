import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByDriverId } from '@/lib/services/orders';
import { http } from '@/lib/utils';
import { byDriverSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { driverId } = byDriverSchema.parse(requestBody);

    const orders = await getOrdersByDriverId(driverId);
    const { body: responseBody, init } = http.ok({ orders });
    return NextResponse.json(responseBody, init);

  } catch (error) {
    console.error('Orders by driver API error:', error);
    
    if (error instanceof ZodError) {
      const { body, init } = http.badRequest('Invalid input data', error.errors);
      return NextResponse.json(body, init);
    }

    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}
