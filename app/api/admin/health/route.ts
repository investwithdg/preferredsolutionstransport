"use server";

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isTwilioConfigured } from '@/lib/notifications/providers/twilio';

export const runtime = 'nodejs';

const HUBSPOT_PIPELINE_KEYS = [
  'HUBSPOT_PIPELINE_ID',
  'HUBSPOT_STAGE_READY',
  'HUBSPOT_STAGE_ASSIGNED',
  'HUBSPOT_STAGE_PICKED_UP',
  'HUBSPOT_STAGE_DELIVERED',
  'HUBSPOT_STAGE_CANCELED',
];

export async function GET() {
  const supabase = createServiceRoleClient();

  const databaseStatus: { ok: boolean; error?: string } = { ok: true };
  try {
    const { error } = await supabase.from('orders').select('id').limit(1);
    if (error) {
      throw error;
    }
  } catch (error) {
    databaseStatus.ok = false;
    databaseStatus.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  const hubspotMissing: string[] = [];
  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    hubspotMissing.push('HUBSPOT_PRIVATE_APP_TOKEN');
  }
  HUBSPOT_PIPELINE_KEYS.forEach((key) => {
    if (!process.env[key]) {
      hubspotMissing.push(key);
    }
  });

  const hubspotStatus = {
    configured: hubspotMissing.length === 0,
    missing: hubspotMissing,
  };

  const stripeStatus = {
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
  };

  const googleMapsStatus = {
    configured: Boolean(
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY &&
        process.env.GOOGLE_MAPS_API_KEY
    ),
  };

  const notificationsStatus = {
    email: Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN),
    sms: isTwilioConfigured(),
    push: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ),
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    hubspot: hubspotStatus,
    stripe: stripeStatus,
    googleMaps: googleMapsStatus,
    notifications: notificationsStatus,
  });
}
