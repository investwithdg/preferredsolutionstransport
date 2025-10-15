import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  createHubSpotClient,
  syncOrderToHubSpot,
  sendHubSpotEmail,
} from '@/lib/hubspot/client';
import type { OrderSyncData } from '@/lib/hubspot/types';
import { orderConfirmationEmail } from '@/lib/hubspot/emails';
import { captureWebhookError, setSentryTag } from '@/lib/sentry';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    // Set Sentry context for this webhook
    setSentryTag('webhook_type', 'stripe');

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      captureWebhookError(err, 'signature_verification', undefined);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Record event idempotently in dispatch_events using unique (source,event_id)
    const insertEvent = await supabase
      .from('dispatch_events')
      .insert({
        order_id: null,
        actor: 'system',
        source: 'stripe',
        event_id: event.id,
        event_type: event.type,
        payload: event as any,
      });
    if (insertEvent.error) {
      const msg = insertEvent.error.message || '';
      if (/duplicate key/i.test(msg) || (insertEvent.error as any).code === '23505') {
        // Already processed; acknowledge to prevent retries
        return NextResponse.json({ received: true, dedup: true });
      }
      console.error('Failed to record webhook event:', insertEvent.error);
      // Avoid retry storm; log and acknowledge
      return NextResponse.json({ received: true, logged: false });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const quoteId = session.metadata?.quote_id;
      const customerId = session.metadata?.customer_id;

      if (!quoteId || !customerId) {
        console.error('Missing metadata in checkout session:', session.id);
        return NextResponse.json(
          { error: 'Missing required metadata' },
          { status: 400 }
        );
      }

      // Get the quote details with customer information
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, customers (*)')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        console.error('Quote not found:', quoteId, quoteError);
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        );
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          quote_id: quoteId,
          customer_id: customerId,
          price_total: session.amount_total! / 100, // Convert from cents
          currency: session.currency || 'usd',
          status: 'ReadyForDispatch',
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_checkout_session_id: session.id,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation failed:', orderError);
        return NextResponse.json(
          { error: 'Failed to create order' },
          { status: 500 }
        );
      }

      // Create dispatch event
      await supabase
        .from('dispatch_events')
        .insert({
          order_id: order.id,
          actor: 'system',
          event_type: 'payment_completed',
          payload: {
            stripe_session_id: session.id,
            amount_paid: session.amount_total! / 100,
            currency: session.currency,
          },
        });

      console.log('Order created successfully:', order.id);

      // HubSpot Integration: Sync order to HubSpot with full property mapping
      const hubspotClient = createHubSpotClient();
      if (hubspotClient && quote.customers) {
        const customer = quote.customers as any;
        
        const orderSyncData: OrderSyncData = {
          orderId: order.id,
          customerId: customerId,
          customerEmail: customer.email,
          customerName: customer.name || undefined,
          customerPhone: customer.phone || undefined,
          priceTotal: order.price_total || 0,
          currency: order.currency || 'usd',
          status: order.status,
          pickupAddress: quote.pickup_address || undefined,
          dropoffAddress: quote.dropoff_address || undefined,
          distanceMiles: quote.distance_mi || undefined,
          createdAt: new Date(order.created_at || new Date().toISOString()),
          
          // Delivery detail properties
          deliveryRoute: quote.pickup_address && quote.dropoff_address 
            ? `${quote.pickup_address} → ${quote.dropoff_address}`
            : undefined,
          deliveryLocation: quote.dropoff_address || undefined,
          deliveryType: 'standard', // Default, could be derived from order data
          weightBracket: 'medium', // Default, could be derived from package weight
          specialDeliveryInstructions: (quote as any).special_instructions || undefined,
          
          // Quote properties (since they paid, quote was sent and accepted)
          quoteSent: true,
          quoteStatus: 'accepted',
          quoteSource: 'website', // Default, could track actual source
          servicesProposed: 'standard_delivery', // Default, could be from quote
          rushRequested: false, // Could be derived from order urgency
          
          // Time properties (if available in quote)
          scheduledPickupTime: (quote as any).scheduled_pickup_time 
            ? new Date((quote as any).scheduled_pickup_time)
            : undefined,
          scheduledDeliveryTime: (quote as any).scheduled_delivery_time
            ? new Date((quote as any).scheduled_delivery_time)
            : undefined,
        };

        const syncResult = await syncOrderToHubSpot(hubspotClient, orderSyncData);
        
        if (!syncResult.success) {
          console.error('HubSpot sync errors:', syncResult.errors);
        }
        
        if (syncResult.warnings && syncResult.warnings.length > 0) {
          console.warn('HubSpot sync warnings:', syncResult.warnings);
        }
        
        if (syncResult.success) {
          console.log(`Successfully synced order to HubSpot. Contact: ${syncResult.contactId}, Deal: ${syncResult.dealId}`);
        }

        // Send order confirmation email
        const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${order.id}`;
        const emailTemplate = orderConfirmationEmail({
          orderId: order.id,
          customerName: customer.name || 'Customer',
          customerEmail: customer.email,
          pickupAddress: quote.pickup_address || 'N/A',
          dropoffAddress: quote.dropoff_address || 'N/A',
          distance: quote.distance_mi || 0,
          priceTotal: order.price_total || 0,
          currency: order.currency || 'usd',
          trackingUrl,
          createdAt: new Date(order.created_at || new Date().toISOString()),
        });

        const emailSent = await sendHubSpotEmail(hubspotClient, {
          to: customer.email,
          subject: emailTemplate.subject,
          htmlContent: emailTemplate.html,
        });

        // Log email event
        if (emailSent) {
          await supabase
            .from('dispatch_events')
            .insert({
              order_id: order.id,
              actor: 'system',
              event_type: 'email_sent',
              payload: {
                email_type: 'order_confirmation',
                recipient: customer.email,
              },
              source: 'hubspot_email',
              event_id: `email_${order.id}_confirmation_${Date.now()}`,
            });
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    captureWebhookError(error, 'processing_error', undefined);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
