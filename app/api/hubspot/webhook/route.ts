import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  verifyHubSpotSignature,
  parseWebhookPayload,
  isPropertyChangeEvent,
  type WebhookEvent,
} from '@/lib/hubspot/webhook';

export const dynamic = 'force-dynamic';

/**
 * POST handler for HubSpot webhooks
 * Receives property change notifications from HubSpot and syncs to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hubspot-signature');

    // Verify webhook signature
    const webhookSecret = process.env.HUBSPOT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('HUBSPOT_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (!signature || !verifyHubSpotSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const webhookEvent = parseWebhookPayload(payload);

    if (!webhookEvent) {
      console.error('Failed to parse webhook payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Check for duplicate event (idempotency)
    const { data: existingEvent } = await (supabase as any)
      .from('hubspot_webhook_events')
      .select('id')
      .eq('event_id', webhookEvent.eventId)
      .single();

    if (existingEvent) {
      console.log(`Webhook event ${webhookEvent.eventId} already processed`);
      return NextResponse.json({ message: 'Event already processed' });
    }

    // Store webhook event for audit trail
    const { error: insertError } = await (supabase as any).from('hubspot_webhook_events').insert({
      event_id: webhookEvent.eventId,
      event_type: webhookEvent.eventType,
      object_type: webhookEvent.objectType,
      object_id: webhookEvent.objectId,
      portal_id: webhookEvent.portalId,
      occurred_at: webhookEvent.occurredAt,
      payload: webhookEvent.rawPayload,
    });

    if (insertError) {
      // If insert fails due to unique constraint, event was processed by another request
      if (insertError.code === '23505') {
        console.log(`Webhook event ${webhookEvent.eventId} already processed (race condition)`);
        return NextResponse.json({ message: 'Event already processed' });
      }
      throw insertError;
    }

    // Process the webhook based on type
    if (isPropertyChangeEvent(webhookEvent)) {
      if (webhookEvent.objectType === 'deal') {
        await handleDealPropertyChange(supabase, webhookEvent);
      } else if (webhookEvent.objectType === 'contact') {
        await handleContactPropertyChange(supabase, webhookEvent);
      }
    }

    return NextResponse.json({
      message: 'Webhook processed successfully',
      eventId: webhookEvent.eventId,
    });
  } catch (error) {
    console.error('HubSpot webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle deal property changes from HubSpot
 * Updates the corresponding order in Supabase
 */
async function handleDealPropertyChange(supabase: any, event: WebhookEvent): Promise<void> {
  if (!event.propertyChanges || event.propertyChanges.length === 0) {
    console.log('No property changes in deal webhook');
    return;
  }

  // Find order by HubSpot deal ID
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('id, quote_id')
    .eq('hubspot_deal_id', event.objectId)
    .single();

  if (findError || !order) {
    console.warn(`Order not found for HubSpot deal ${event.objectId}`);
    return;
  }

  // Filter only the properties we care about caching
  const allowedProperties = [
    'special_delivery_instructions',
    'specialDeliveryInstructions',
    process.env.HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS,
    'recurring_frequency',
    'recurringFrequency',
    process.env.HUBSPOT_PROP_RECURRING_FREQUENCY,
    'rush_requested',
    'rushRequested',
    process.env.HUBSPOT_PROP_RUSH_REQUESTED,
  ].filter(Boolean);

  // Build metadata object from allowed properties only
  const metadataUpdates: Record<string, any> = {};

  for (const change of event.propertyChanges) {
    if (allowedProperties.includes(change.name)) {
      // Map HubSpot property names to our standard metadata keys
      let key = change.name;
      if (
        change.name === process.env.HUBSPOT_PROP_SPECIAL_DELIVERY_INSTRUCTIONS ||
        change.name === 'special_delivery_instructions'
      ) {
        key = 'specialDeliveryInstructions';
      } else if (
        change.name === process.env.HUBSPOT_PROP_RECURRING_FREQUENCY ||
        change.name === 'recurring_frequency'
      ) {
        key = 'recurringFrequency';
      } else if (
        change.name === process.env.HUBSPOT_PROP_RUSH_REQUESTED ||
        change.name === 'rush_requested'
      ) {
        key = 'rushRequested';
      }
      metadataUpdates[key] = change.value;
    }
  }

  // Only update if we have metadata changes
  if (Object.keys(metadataUpdates).length > 0) {
    // Fetch current metadata to merge
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('hubspot_metadata')
      .eq('id', order.id)
      .single();

    const currentMetadata = currentOrder?.hubspot_metadata || {};
    const mergedMetadata = { ...currentMetadata, ...metadataUpdates };

    // Validate the metadata using our SQL function
    const { data: validatedData } = await supabase.rpc('validate_hubspot_metadata', {
      metadata: mergedMetadata,
    });

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        hubspot_metadata: validatedData || mergedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order metadata:', updateError);
    } else {
      console.log(`Updated order ${order.id} metadata from HubSpot deal ${event.objectId}`);
    }
  }

  // We no longer sync quotes table from HubSpot - operational data stays in Supabase

  // Log sync event to dispatch_events
  await supabase.from('dispatch_events').insert({
    order_id: order.id,
    actor: 'system',
    source: 'hubspot',
    event_type: 'sync_from_hubspot',
    event_data: {
      dealId: event.objectId,
      propertyChanges: event.propertyChanges.filter((pc) => allowedProperties.includes(pc.name)),
      metadataUpdates,
    },
  });
}

/**
 * Handle contact property changes from HubSpot
 * We no longer sync contact data back to Supabase - customer data is mastered in Supabase
 */
async function handleContactPropertyChange(supabase: any, event: WebhookEvent): Promise<void> {
  // Log the event for audit purposes but don't sync
  console.log(
    `Received contact webhook for ${event.objectId} but not syncing - customer data mastered in Supabase`
  );

  // Could optionally store in audit log for future reference
  await supabase.from('dispatch_events').insert({
    actor: 'system',
    source: 'hubspot',
    event_type: 'contact_webhook_ignored',
    event_data: {
      contactId: event.objectId,
      propertyChanges: event.propertyChanges,
      reason: 'Customer data mastered in Supabase',
    },
  });
}

/**
 * GET handler - returns webhook configuration info (for testing/verification)
 */
export async function GET() {
  return NextResponse.json({
    message: 'HubSpot webhook endpoint',
    configured: !!process.env.HUBSPOT_WEBHOOK_SECRET,
    supportedEvents: ['contact.propertyChange', 'deal.propertyChange'],
  });
}
