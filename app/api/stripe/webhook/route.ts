import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

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

      // Get the quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
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
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
