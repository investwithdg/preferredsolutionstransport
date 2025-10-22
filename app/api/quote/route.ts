import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quoteRequestSchema } from '@/lib/validations';
import { calculatePrice } from '@/lib/pricing';
import { PRICING, AppError, handleApiError } from '@/lib/config';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientId = getClientIdentifier(request);
    await checkRateLimit(clientId, 'quote');

    const body = await request.json();

    // Validate input
    const validatedData = quoteRequestSchema.parse(body);
    const { name, email, phone, pickupAddress, dropoffAddress, distanceMi, weightLb } = validatedData;

    // Normalize email for idempotent upserts
    const normalizedEmail = email.trim().toLowerCase();

    // Calculate pricing
    const pricing = calculatePrice({
      ...PRICING,
      distanceMi,
      weightLb,
    });

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();

    // First, try to find existing customer
    const { data: existingCustomer, error: customerLookupError } = await supabase
      .from('customers')
      .select()
      .eq('email', normalizedEmail)
      .single();

    if (customerLookupError && customerLookupError.code !== 'PGRST116') {
      throw new AppError('Failed to lookup customer', 500, 'CUSTOMER_LOOKUP_ERROR');
    }

    let customer;
    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ name, phone })
        .eq('email', normalizedEmail)
        .select()
        .single();

      if (updateError) {
        throw new AppError('Failed to update customer record', 500, 'CUSTOMER_UPDATE_ERROR');
      }
      customer = updatedCustomer;
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ email: normalizedEmail, name, phone })
        .select()
        .single();

      if (createError) {
        throw new AppError('Failed to create customer record', 500, 'CUSTOMER_CREATE_ERROR');
      }
      customer = newCustomer;
    }

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        customer_id: customer.id,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        distance_mi: distanceMi,
        weight_lb: weightLb,
        pricing: pricing,
        status: 'Draft',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      })
      .select()
      .single();

    if (quoteError) {
      throw new AppError('Failed to create quote', 500, 'QUOTE_CREATE_ERROR');
    }

    return NextResponse.json({
      quoteId: quote.id,
      pricing,
    });

  } catch (error) {
    const errorResponse = handleApiError(error, 'Quote creation');
    const statusCode = error instanceof AppError ? error.statusCode : 500;

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
