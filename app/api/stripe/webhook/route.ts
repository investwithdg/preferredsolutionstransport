import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRepositories, DuplicateEventError } from '@/lib/database/repositories';
import { successResponse, errorResponse, HTTP_STATUS } from '@/lib/api/utils';
import {
  createHubSpotClient,
  upsertHubSpotContact,
  createHubSpotDeal,
} from '@/lib/hubspot/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return errorResponse('Invalid signature', HTTP_STATUS.BAD_REQUEST);
    }

    // Create repositories
    const supabase = createServiceRoleClient();
    const repos = createRepositories(supabase);

    // Record event idempotently
    try {
      await repos.dispatchEvents.create({
        orderId: null,
        actor: 'system',
        source: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: event,
      });
    } catch (error) {
      if (error instanceof DuplicateEventError) {
        // Already processed; acknowledge to prevent retries
        return successResponse({ received: true, dedup: true });
      }
      console.error('Failed to record webhook event:', error);
      // Avoid retry storm; log and acknowledge
      return successResponse({ received: true, logged: false });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const quoteId = session.metadata?.quote_id;
      const customerId = session.metadata?.customer_id;

      if (!quoteId || !customerId) {
        console.error('Missing metadata in checkout session:', session.id);
        return errorResponse('Missing required metadata', HTTP_STATUS.BAD_REQUEST);
      }

      // Get the quote details
      const quote = await repos.quotes.getByIdWithCustomer(quoteId);

      if (!quote) {
        console.error('Quote not found:', quoteId);
        return errorResponse('Quote not found', HTTP_STATUS.NOT_FOUND);
      }

      // Create order
      const order = await repos.orders.create({
        quote_id: quoteId,
        customer_id: customerId,
        price_total: session.amount_total! / 100, // Convert from cents
        currency: session.currency || 'usd',
        status: 'ReadyForDispatch',
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_checkout_session_id: session.id,
      });

      // Create dispatch event
      await repos.dispatchEvents.create({
        orderId: order.id,
        actor: 'system',
        eventType: 'payment_completed',
        payload: {
          stripe_session_id: session.id,
          amount_paid: session.amount_total! / 100,
          currency: session.currency,
        },
        source: 'stripe',
        eventId: `${event.id}-payment-completed`,
      });

      console.log('Order created successfully:', order.id);

      // HubSpot Integration: Create contact and deal
      const hubspotClient = createHubSpotClient();
      if (hubspotClient && quote.customers) {
        const contactId = await upsertHubSpotContact(hubspotClient, {
          email: quote.customers.email,
          name: quote.customers.name || undefined,
          phone: quote.customers.phone || undefined,
        });

        if (contactId) {
          await createHubSpotDeal(
            hubspotClient,
            {
              properties: {
                dealname: `Delivery Order - ${order.id.slice(0, 8)}`,
                amount: (order.price_total || 0).toString(),
                pipeline: 'default', // Or your specific pipeline ID
                dealstage: 'appointmentscheduled', // Or your specific stage ID
                closedate: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(), // e.g., 30 days from now
              },
            },
            contactId
          );
        }
      }
    }

    return successResponse({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse('Webhook processing failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
