import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkoutRequestSchema } from '@/lib/validations';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { quoteId } = checkoutRequestSchema.parse(body);

    // Get quote from database
    const supabase = createServiceRoleClient();
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customers (*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Quote lookup error:', quoteError);
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote is expired
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Quote has expired' },
        { status: 400 }
      );
    }

    // Extract pricing from quote
    const pricing = quote.pricing as any;
    const amountInCents = Math.round(pricing.total * 100);

    // Determine base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`);

    // Create Stripe Checkout Session with deterministic idempotency anchor
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      client_reference_id: quoteId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Delivery Service',
              description: `From ${quote.pickup_address} to ${quote.dropoff_address}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      customer_email: quote.customers?.email,
      metadata: {
        quote_id: quoteId,
        customer_id: quote.customer_id,
      },
      success_url: `${baseUrl}/thank-you`,
      cancel_url: `${baseUrl}/quote`,
    });

    // Persist session id on quote for diagnostics/idempotency
    await supabase
      .from('quotes')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', quoteId);

    return NextResponse.json({
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout API error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
