/**
 * Real-time Orders Hook
 * Subscribes to Supabase real-time updates for orders
 * Automatically updates UI when data changes (including from HubSpot webhooks)
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Order {
  id: string;
  status: string;
  price_total: number;
  currency?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  hubspot_deal_id?: string | null;
  hubspot_metadata?: Record<string, any> | null;
  customers?: {
    id?: string;
    name?: string | null;
    email?: string;
    phone?: string | null;
    hubspot_contact_id?: string | null;
    created_at?: string | null;
  } | null;
  quotes?: {
    id?: string;
    pickup_address?: string;
    dropoff_address?: string;
    distance_mi?: number;
  } | null;
  drivers?: {
    id?: string;
    name?: string;
    phone?: string;
  } | null;
}

interface UseRealtimeOrdersOptions {
  customerId?: string;
  driverId?: string;
  status?: string;
  initialOrders?: Order[];
}

interface UseRealtimeOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdate: Date | null;
}

/**
 * Hook to subscribe to real-time order updates
 * Automatically refreshes when orders are modified in Supabase (including from HubSpot webhooks)
 */
export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}): UseRealtimeOrdersReturn {
  const { customerId, driverId, status, initialOrders = [] } = options;
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const supabase = createClient();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Fetch orders from unified endpoint
  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (customerId) params.set('customer_id', customerId);
      if (driverId) params.set('driver_id', driverId);
      if (status) params.set('status', status);

      // Use unified endpoint that returns filtered metadata
      const response = await fetch(`/api/orders/unified?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const result = await response.json();

      // Transform to match expected format
      const transformedOrders = (result.orders || []).map((order: any) => ({
        ...order,
        customers: order.customer,
        quotes: order.quote,
        drivers: order.driver,
        // hubspot_metadata is already filtered by role
      }));

      setOrders(transformedOrders);
      setLastUpdate(new Date());

      // Log metadata availability for debugging
      if (isDevelopment && result.metadata) {
        console.debug('Orders fetched with role:', result.metadata.user_role);
        console.debug(
          'Available HubSpot fields:',
          result.metadata.available_fields?.hubspot_metadata_fields
        );
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    if (initialOrders.length === 0) {
      fetchOrders();
    } else {
      setOrders(initialOrders);
      setLastUpdate(new Date());
    }
    // Subscribe to changes
    const channelName = `orders-${customerId || driverId || status || 'all'}`;
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(customerId && { filter: `customer_id=eq.${customerId}` }),
          ...(driverId && { filter: `driver_id=eq.${driverId}` }),
          ...(status && { filter: `status=eq.${status}` }),
        },
        (payload: any) => {
          if (isDevelopment) {
            console.debug('Real-time order update:', payload);
          }

          if (payload.eventType === 'INSERT') {
            // Fetch the full order with relations
            fetchOrders();
          } else if (payload.eventType === 'UPDATE') {
            // Update existing order or refetch
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted order
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe((status: any) => {
        if (isDevelopment) {
          console.debug('Real-time subscription status:', status);
        }
      });

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, driverId, status]);

  return {
    orders,
    isLoading,
    error,
    refresh: fetchOrders,
    lastUpdate,
  };
}
