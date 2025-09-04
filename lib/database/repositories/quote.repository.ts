import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { PricingResult } from '@/lib/pricing';

type QuoteTable = Database['public']['Tables']['quotes'];
export type Quote = QuoteTable['Row'];
export type QuoteInsert = QuoteTable['Insert'];
export type QuoteUpdate = QuoteTable['Update'];

export type QuoteWithCustomer = Quote & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
};

export class QuoteRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates a new quote
   */
  async create(data: {
    customerId: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceMi: number;
    weightLb?: number;
    pricing: PricingResult;
  }): Promise<Quote> {
    const { data: quote, error } = await this.supabase
      .from('quotes')
      .insert({
        customer_id: data.customerId,
        pickup_address: data.pickupAddress,
        dropoff_address: data.dropoffAddress,
        distance_mi: data.distanceMi,
        weight_lb: data.weightLb,
        pricing: data.pricing as any,
        status: 'Draft',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create quote: ${error.message}`);
    }

    return quote;
  }

  /**
   * Gets a quote by ID with customer information
   */
  async getByIdWithCustomer(id: string): Promise<QuoteWithCustomer> {
    const { data, error } = await this.supabase
      .from('quotes')
      .select(`
        *,
        customers (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get quote: ${error.message}`);
    }

    return data as QuoteWithCustomer;
  }

  /**
   * Updates a quote
   */
  async update(id: string, data: QuoteUpdate): Promise<Quote> {
    const { data: quote, error } = await this.supabase
      .from('quotes')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update quote: ${error.message}`);
    }

    return quote;
  }

  /**
   * Checks if a quote is expired
   */
  isExpired(quote: Quote): boolean {
    if (!quote.expires_at) return false;
    return new Date(quote.expires_at) < new Date();
  }

  /**
   * Updates the Stripe checkout session ID for a quote
   */
  async updateCheckoutSessionId(quoteId: string, sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quotes')
      .update({ stripe_checkout_session_id: sessionId })
      .eq('id', quoteId);

    if (error) {
      throw new Error(`Failed to update checkout session: ${error.message}`);
    }
  }
}