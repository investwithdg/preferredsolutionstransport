import { NextRequest, NextResponse } from 'next/server';
import { calculateDistance } from '@/lib/google-maps/distance';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { origin, destination } = await req.json();
    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }

    const result = await calculateDistance(origin, destination);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to calculate distance' }, { status: 500 });
  }
}


