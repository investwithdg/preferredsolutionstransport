import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quoteRequestSchema } from '@/lib/validations';
import { calculatePrice } from '@/lib/pricing';
import { PRICING } from '@/lib/config';
import { createRepositories } from '@/lib/database/repositories';
import { withErrorHandler, validateRequestBody, successResponse, errorResponse, HTTP_STATUS } from '@/lib/api/utils';

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate input
  const validatedData = await validateRequestBody(request, quoteRequestSchema);
  const { name, email, phone, pickupAddress, dropoffAddress, distanceMi, weightLb } = validatedData;

  // Calculate pricing
  const pricing = calculatePrice({
    ...PRICING,
    distanceMi,
    weightLb,
  });

  // Create repositories
  const supabase = createServiceRoleClient();
  const repos = createRepositories(supabase);

  // Upsert customer
  const customer = await repos.customers.upsert({ email, name, phone });

  // Create quote
  const quote = await repos.quotes.create({
    customerId: customer.id,
    pickupAddress,
    dropoffAddress,
    distanceMi,
    weightLb,
    pricing,
  });

  return successResponse({
    quoteId: quote.id,
    pricing,
  });
});
