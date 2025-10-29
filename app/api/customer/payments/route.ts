import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer/payments
 * Fetches payment history for the authenticated customer
 */
export async function GET() {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('email', session.user.email!)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get all orders for this customer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        `
        id,
        price_total,
        currency,
        status,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        created_at,
        quotes (
          pickup_address,
          dropoff_address
        )
      `
      )
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ payments: [] });
    }

    // Fetch payment details from Stripe for each order
    const paymentsPromises = orders.map(async (order) => {
      if (!order.stripe_payment_intent_id) {
        return {
          orderId: order.id,
          amount: order.price_total,
          currency: order.currency || 'usd',
          status: order.status === 'AwaitingPayment' ? 'pending' : 'unknown',
          paymentMethod: null,
          receiptUrl: null,
          created: order.created_at
            ? new Date(order.created_at).getTime() / 1000
            : Date.now() / 1000,
          route: order.quotes
            ? `${order.quotes.pickup_address} → ${order.quotes.dropoff_address}`
            : 'N/A',
        };
      }

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {
          expand: ['payment_method', 'latest_charge'],
        });

        const charge = paymentIntent.latest_charge as Stripe.Charge | null;

        return {
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          paymentMethod: paymentIntent.payment_method
            ? {
                type: (paymentIntent.payment_method as Stripe.PaymentMethod).type,
                last4: (paymentIntent.payment_method as Stripe.PaymentMethod).card?.last4,
                brand: (paymentIntent.payment_method as Stripe.PaymentMethod).card?.brand,
              }
            : null,
          receiptUrl: charge?.receipt_url || null,
          created: paymentIntent.created,
          route: order.quotes
            ? `${order.quotes.pickup_address} → ${order.quotes.dropoff_address}`
            : 'N/A',
        };
      } catch (stripeError: any) {
        console.error(
          `Error fetching payment intent ${order.stripe_payment_intent_id}:`,
          stripeError
        );

        // Return partial data if Stripe fetch fails
        return {
          orderId: order.id,
          amount: order.price_total,
          currency: order.currency || 'usd',
          status: 'error',
          paymentMethod: null,
          receiptUrl: null,
          created: order.created_at
            ? new Date(order.created_at).getTime() / 1000
            : Date.now() / 1000,
          route: order.quotes
            ? `${order.quotes.pickup_address} → ${order.quotes.dropoff_address}`
            : 'N/A',
          error: stripeError.message,
        };
      }
    });

    const payments = await Promise.all(paymentsPromises);

    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('Error in GET /api/customer/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
