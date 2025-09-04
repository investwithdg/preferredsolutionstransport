import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { CustomerRepository } from './customer.repository';
import { QuoteRepository } from './quote.repository';
import { OrderRepository } from './order.repository';
import { DispatchEventRepository } from './dispatch-event.repository';

export * from './customer.repository';
export * from './quote.repository';
export * from './order.repository';
export * from './dispatch-event.repository';

/**
 * Repository factory that creates all repositories with a single Supabase client
 */
export class RepositoryFactory {
  public readonly customers: CustomerRepository;
  public readonly quotes: QuoteRepository;
  public readonly orders: OrderRepository;
  public readonly dispatchEvents: DispatchEventRepository;

  constructor(private supabase: SupabaseClient<Database>) {
    this.customers = new CustomerRepository(supabase);
    this.quotes = new QuoteRepository(supabase);
    this.orders = new OrderRepository(supabase);
    this.dispatchEvents = new DispatchEventRepository(supabase);
  }
}

/**
 * Creates a repository factory instance
 */
export function createRepositories(supabase: SupabaseClient<Database>): RepositoryFactory {
  return new RepositoryFactory(supabase);
}