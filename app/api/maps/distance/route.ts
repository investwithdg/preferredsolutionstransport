import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();
    if (!origin || !destination) {
      return NextResponse.json({ error: 'origin and destination are required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      key: apiKey,
      units: 'imperial',
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    const data = await res.json();

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0] || data.rows[0].elements[0].status !== 'OK') {
      return NextResponse.json({ error: 'Failed to calculate distance', details: data }, { status: 400 });
    }

    const element = data.rows[0].elements[0];
    const distanceText: string = element.distance.text; // e.g., "12.3 mi"
    const miles = parseFloat(distanceText.replace(/[^0-9.]/g, ''));
    const durationText: string = element.duration.text;

    return NextResponse.json({ miles, distanceText, durationText });
  } catch (err) {
    console.error('Distance API error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

