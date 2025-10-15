import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByDriverId } from '@/lib/services/orders';
import { http } from '@/lib/utils';
import { byDriverSchema } from '@/lib/validations';
import { z } from 'zod';

const byDriverSchema = z.object({
  driverId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId } = byDriverSchema.parse(body);

    const orders = await getOrdersByDriverId(driverId);
    const { body, init } = http.ok({ orders });
    return NextResponse.json(body, init);

  } catch (error) {
    console.error('Orders by driver API error:', error);
    
    if (error instanceof z.ZodError) {
      const { body, init } = http.badRequest('Invalid input data', error.errors);
      return NextResponse.json(body, init);
    }

    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}
