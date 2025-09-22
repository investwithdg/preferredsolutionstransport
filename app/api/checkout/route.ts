import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkoutRequestSchema } from '@/lib/validations';
import { AppError, handleApiError } from '@/lib/config';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientId = getClientIdentifier(request);
    await checkRateLimit(clientId, 'checkout');

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
      throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');
    }

    // Check if quote is expired
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      throw new AppError('Quote has expired', 400, 'QUOTE_EXPIRED');
    }

    // Check if quote already has a checkout session
    if (quote.stripe_checkout_session_id) {
      // Return existing session instead of creating a new one
      const existingSession = await stripe.checkout.sessions.retrieve(quote.stripe_checkout_session_id);
      return NextResponse.json({
        url: existingSession.url,
      });
    }

    // Extract pricing from quote
    const pricing = quote.pricing as any;
    if (!pricing?.total || pricing.total <= 0) {
      throw new AppError('Invalid quote pricing', 400, 'INVALID_PRICING');
    }

    const amountInCents = Math.round(pricing.total * 100);

    // Determine base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : `${request.nextUrl.protocol}//${request.nextUrl.host}`));

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
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', quoteId);

    if (updateError) {
      console.warn('Failed to persist checkout session ID:', updateError);
      // Don't fail the request, just log the warning
    }

    return NextResponse.json({
      url: session.url,
    });

  } catch (error) {
    const errorResponse = handleApiError(error, 'Checkout creation');
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
