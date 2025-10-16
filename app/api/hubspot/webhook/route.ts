import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { 
  verifyHubSpotSignature, 
  parseWebhookPayload, 
  isPropertyChangeEvent,
  type WebhookEvent 
} from '@/lib/hubspot/webhook';
import { 
  mapPropertyChangesToSupabase, 
  combineContactName 
} from '@/lib/hubspot/reverse-mappings';
import { http } from '@/lib/utils';

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
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    if (!signature || !verifyHubSpotSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const webhookEvent = parseWebhookPayload(payload);

    if (!webhookEvent) {
      console.error('Failed to parse webhook payload');
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check for duplicate event (idempotency)
    const { data: existingEvent } = await supabase
      .from('hubspot_webhook_events')
      .select('id')
      .eq('event_id', webhookEvent.eventId)
      .single();

    if (existingEvent) {
      console.log(`Webhook event ${webhookEvent.eventId} already processed`);
      return NextResponse.json({ message: 'Event already processed' });
    }

    // Store webhook event for audit trail
    const { error: insertError } = await supabase
      .from('hubspot_webhook_events')
      .insert({
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
      eventId: webhookEvent.eventId 
    });

  } catch (error) {
    console.error('HubSpot webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle deal property changes from HubSpot
 * Updates the corresponding order in Supabase
 */
async function handleDealPropertyChange(
  supabase: any,
  event: WebhookEvent
): Promise<void> {
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

  // Map property changes to Supabase updates
  const updates = mapPropertyChangesToSupabase('deal', event.propertyChanges);

  // Update orders table if needed
  if (updates.orders && Object.keys(updates.orders).length > 0) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        ...updates.orders,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
    } else {
      console.log(`Updated order ${order.id} from HubSpot deal ${event.objectId}`);
    }
  }

  // Update quotes table if needed
  if (updates.quotes && Object.keys(updates.quotes).length > 0 && order.quote_id) {
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        ...updates.quotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.quote_id);

    if (updateError) {
      console.error('Failed to update quote:', updateError);
    } else {
      console.log(`Updated quote ${order.quote_id} from HubSpot deal ${event.objectId}`);
    }
  }

  // Log sync event to dispatch_events
  await supabase
    .from('dispatch_events')
    .insert({
      order_id: order.id,
      actor: 'system',
      source: 'hubspot',
      event_type: 'sync_from_hubspot',
      event_data: {
        dealId: event.objectId,
        propertyChanges: event.propertyChanges,
        updates,
      },
    });
}

/**
 * Handle contact property changes from HubSpot
 * Updates the corresponding customer in Supabase
 */
async function handleContactPropertyChange(
  supabase: any,
  event: WebhookEvent
): Promise<void> {
  if (!event.propertyChanges || event.propertyChanges.length === 0) {
    console.log('No property changes in contact webhook');
    return;
  }

  // Find customer by HubSpot contact ID
  const { data: customer, error: findError } = await supabase
    .from('customers')
    .select('id, email, name')
    .eq('hubspot_contact_id', event.objectId)
    .single();

  if (findError || !customer) {
    console.warn(`Customer not found for HubSpot contact ${event.objectId}`);
    return;
  }

  // Map property changes to Supabase updates
  const updates = mapPropertyChangesToSupabase('contact', event.propertyChanges);

  // Special handling for name fields (combine firstname + lastname)
  const changedProps = event.propertyChanges.map(c => c.name);
  if (changedProps.includes('firstname') || changedProps.includes('lastname')) {
    const fullName = combineContactName(event.propertyChanges, customer.name?.split(' ')[0], customer.name?.split(' ').slice(1).join(' '));
    if (fullName && updates.customers) {
      updates.customers.name = fullName;
    }
  }

  // Update customers table if needed
  if (updates.customers && Object.keys(updates.customers).length > 0) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        ...updates.customers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customer.id);

    if (updateError) {
      console.error('Failed to update customer:', updateError);
    } else {
      console.log(`Updated customer ${customer.id} from HubSpot contact ${event.objectId}`);
    }
  }
}

/**
 * GET handler - returns webhook configuration info (for testing/verification)
 */
export async function GET() {
  return NextResponse.json({
    message: 'HubSpot webhook endpoint',
    configured: !!process.env.HUBSPOT_WEBHOOK_SECRET,
    supportedEvents: [
      'contact.propertyChange',
      'deal.propertyChange',
    ],
  });
}

