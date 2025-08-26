import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { quoteRequestSchema } from '@/lib/validations';
import { calculatePrice } from '@/lib/pricing';
import { PRICING } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
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
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select()
      .eq('email', normalizedEmail)
      .single();

    let customer;
    let customerError;

    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ name, phone })
        .eq('email', normalizedEmail)
        .select()
        .single();
      
      customer = updatedCustomer;
      customerError = updateError;
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ email: normalizedEmail, name, phone })
        .select()
        .single();
      
      customer = newCustomer;
      customerError = createError;
    }

    if (customerError) {
      console.error('Customer upsert error:', customerError);
      return NextResponse.json(
        { error: 'Failed to create customer record' },
        { status: 500 }
      );
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
      console.error('Quote creation error:', quoteError);
      return NextResponse.json(
        { error: 'Failed to create quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quoteId: quote.id,
      pricing,
    });

  } catch (error) {
    console.error('Quote API error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
