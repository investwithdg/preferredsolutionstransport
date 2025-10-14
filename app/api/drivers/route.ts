import { NextRequest, NextResponse } from 'next/server';
import { listDriversWithStats, createDriver } from '@/lib/services/drivers';
import { http } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const drivers = await listDriversWithStats();
    const { body, init } = http.ok({ drivers });
    return NextResponse.json(body, init);

  } catch (error) {
    console.error('Drivers API error:', error);
    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, phone, vehicle_details } = body;

    if (!name) {
      const { body, init } = http.badRequest('Driver name is required');
      return NextResponse.json(body, init);
    }

    const driver = await createDriver({ name, phone, vehicle_details });
    const { body: okBody, init } = http.ok({ message: 'Driver created successfully', driver });
    return NextResponse.json(okBody, init);

  } catch (error) {
    console.error('Driver creation API error:', error);
    const { body, init } = http.serverError();
    return NextResponse.json(body, init);
  }
}
