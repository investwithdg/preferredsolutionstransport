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

  const isDemoMode = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

  // Fetch orders from database (skipped in demo when initialOrders provided)
  const fetchOrders = async () => {
    if (isDemoMode && initialOrders.length > 0) {
      setOrders(initialOrders);
      setLastUpdate(new Date());
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (*),
          quotes (*),
          drivers (id, name, phone)
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      if (status) {
        query = query.eq('status', status as any);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setOrders(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription (skip in demo)
  useEffect(() => {
    // Initial fetch
    if (initialOrders.length === 0) {
      fetchOrders();
    } else {
      setOrders(initialOrders);
      setLastUpdate(new Date());
    }

    if (isDemoMode) {
      return;
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
          console.log('Real-time order update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the full order with relations
            fetchOrders();
          } else if (payload.eventType === 'UPDATE') {
            // Update existing order or refetch
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted order
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe((status: any) => {
        console.log('Real-time subscription status:', status);
      });

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, driverId, status]);

  // Keep orders in sync if parent supplies new initialOrders in demo mode
  useEffect(() => {
    if (isDemoMode) {
      setOrders(initialOrders);
      setLastUpdate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialOrders), isDemoMode]);

  return {
    orders,
    isLoading,
    error,
    refresh: fetchOrders,
    lastUpdate,
  };
}

