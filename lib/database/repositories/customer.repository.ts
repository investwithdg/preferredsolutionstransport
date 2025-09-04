import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

type CustomerTable = Database['public']['Tables']['customers'];
export type Customer = CustomerTable['Row'];
export type CustomerInsert = CustomerTable['Insert'];
export type CustomerUpdate = CustomerTable['Update'];

export class CustomerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Upserts a customer by email (creates new or updates existing)
   */
  async upsert(data: {
    email: string;
    name?: string;
    phone?: string;
  }): Promise<Customer> {
    const normalizedEmail = data.email.trim().toLowerCase();
    
    // First, try to find existing customer
    const { data: existingCustomer } = await this.supabase
      .from('customers')
      .select()
      .eq('email', normalizedEmail)
      .single();

    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error } = await this.supabase
        .from('customers')
        .update({ 
          name: data.name, 
          phone: data.phone 
        })
        .eq('email', normalizedEmail)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to update customer: ${error.message}`);
      }
      
      return updatedCustomer;
    } else {
      // Create new customer
      const { data: newCustomer, error } = await this.supabase
        .from('customers')
        .insert({ 
          email: normalizedEmail, 
          name: data.name, 
          phone: data.phone 
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create customer: ${error.message}`);
      }
      
      return newCustomer;
    }
  }

  /**
   * Finds a customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const normalizedEmail = email.trim().toLowerCase();
    
    const { data, error } = await this.supabase
      .from('customers')
      .select()
      .eq('email', normalizedEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to find customer: ${error.message}`);
    }

    return data;
  }

  /**
   * Gets a customer by ID
   */
  async getById(id: string): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get customer: ${error.message}`);
    }

    return data;
  }
}