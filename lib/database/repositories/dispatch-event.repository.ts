import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

type DispatchEventTable = Database['public']['Tables']['dispatch_events'];
export type DispatchEvent = DispatchEventTable['Row'];
export type DispatchEventInsert = DispatchEventTable['Insert'];

export class DispatchEventRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Records a dispatch event
   */
  async create(data: {
    orderId?: string | null;
    actor: string;
    eventType: string;
    payload?: any;
    source: string;
    eventId: string;
  }): Promise<DispatchEvent> {
    const { data: event, error } = await this.supabase
      .from('dispatch_events')
      .insert({
        order_id: data.orderId,
        actor: data.actor,
        event_type: data.eventType,
        payload: data.payload || {},
        source: data.source,
        event_id: data.eventId,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate key error (idempotency)
      if (error.code === '23505' || /duplicate key/i.test(error.message)) {
        throw new DuplicateEventError('Event already processed');
      }
      throw new Error(`Failed to create dispatch event: ${error.message}`);
    }

    return event;
  }

  /**
   * Gets events for an order
   */
  async getByOrderId(orderId: string): Promise<DispatchEvent[]> {
    const { data, error } = await this.supabase
      .from('dispatch_events')
      .select()
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get dispatch events: ${error.message}`);
    }

    return data;
  }

  /**
   * Records an order status change event
   */
  async recordStatusChange(data: {
    orderId: string;
    actor: string;
    oldStatus: string;
    newStatus: string;
    source?: string;
  }): Promise<DispatchEvent> {
    return this.create({
      orderId: data.orderId,
      actor: data.actor,
      eventType: 'status_changed',
      payload: {
        old_status: data.oldStatus,
        new_status: data.newStatus,
      },
      source: data.source || 'api',
      eventId: `${data.orderId}-status-${Date.now()}`,
    });
  }

  /**
   * Records a driver assignment event
   */
  async recordDriverAssignment(data: {
    orderId: string;
    driverId: string;
    driverName: string;
    dispatcher: string;
  }): Promise<DispatchEvent> {
    return this.create({
      orderId: data.orderId,
      actor: data.dispatcher,
      eventType: 'driver_assigned',
      payload: {
        driver_id: data.driverId,
        driver_name: data.driverName,
      },
      source: 'dispatcher',
      eventId: `${data.orderId}-assign-${Date.now()}`,
    });
  }
}

/**
 * Custom error for duplicate events (idempotency)
 */
export class DuplicateEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEventError';
  }
}