import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkoutRequestSchema } from '@/lib/validations';
import { createRepositories } from '@/lib/database/repositories';
import { withErrorHandler, validateRequestBody, successResponse, errorResponse, HTTP_STATUS, getBaseUrl } from '@/lib/api/utils';
import { PricingResult } from '@/lib/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate input
  const { quoteId } = await validateRequestBody(request, checkoutRequestSchema);

  // Create repositories
  const supabase = createServiceRoleClient();
  const repos = createRepositories(supabase);

  // Get quote with customer
  const quote = await repos.quotes.getByIdWithCustomer(quoteId);

  if (!quote) {
    return errorResponse('Quote not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if quote is expired
  if (repos.quotes.isExpired(quote)) {
    return errorResponse('Quote has expired', HTTP_STATUS.BAD_REQUEST);
  }

  // Extract pricing from quote
  const pricing = quote.pricing as PricingResult;
  const amountInCents = Math.round(pricing.total * 100);

  // Determine base URL for redirects
  const baseUrl = getBaseUrl(request);

  // Create Stripe Checkout Session
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

  // Persist session id on quote
  await repos.quotes.updateCheckoutSessionId(quoteId, session.id);

  return successResponse({
    url: session.url,
  });
});
