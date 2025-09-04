import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

type OrderTable = Database['public']['Tables']['orders'];
export type Order = OrderTable['Row'];
export type OrderInsert = OrderTable['Insert'];
export type OrderUpdate = OrderTable['Update'];
export type OrderStatus = Database['public']['Enums']['order_status'];

export type OrderWithRelations = Order & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
  quotes: Database['public']['Tables']['quotes']['Row'] | null;
  drivers?: Database['public']['Tables']['drivers']['Row'] | null;
};

export class OrderRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates a new order
   */
  async create(data: OrderInsert): Promise<Order> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return order;
  }

  /**
   * Gets orders by status with related data
   */
  async getByStatusWithRelations(status: OrderStatus): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        quotes (*),
        drivers (*)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }

    return data as OrderWithRelations[];
  }

  /**
   * Gets orders ready for dispatch
   */
  async getReadyForDispatch(): Promise<OrderWithRelations[]> {
    return this.getByStatusWithRelations('ReadyForDispatch');
  }

  /**
   * Gets a single order by ID with relations
   */
  async getByIdWithRelations(id: string): Promise<OrderWithRelations> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        quotes (*),
        drivers (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get order: ${error.message}`);
    }

    return data as OrderWithRelations;
  }

  /**
   * Updates an order
   */
  async update(id: string, data: OrderUpdate): Promise<Order> {
    const { data: order, error } = await this.supabase
      .from('orders')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return order;
  }

  /**
   * Updates order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.update(id, { status });
  }

  /**
   * Assigns a driver to an order
   */
  async assignDriver(orderId: string, driverId: string): Promise<Order> {
    return this.update(orderId, { 
      driver_id: driverId,
      status: 'Assigned' 
    });
  }

  /**
   * Gets orders by driver
   */
  async getByDriverId(driverId: string): Promise<OrderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        quotes (*)
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get driver orders: ${error.message}`);
    }

    return data as OrderWithRelations[];
  }

  /**
   * Finds order by Stripe session ID
   */
  async findByStripeSessionId(sessionId: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select()
      .eq('stripe_checkout_session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find order: ${error.message}`);
    }

    return data;
  }
}