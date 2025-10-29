/**
 * Real-time Drivers Hook
 * Subscribes to Supabase real-time updates for drivers
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_details?: any;
  created_at?: string;
  active_orders_count?: number;
  is_available?: boolean;
}

interface UseRealtimeDriversReturn {
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to subscribe to real-time driver updates
 */
export function useRealtimeDrivers(initialDrivers: Driver[] = []): UseRealtimeDriversReturn {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Fetch drivers with active order counts
  const fetchDrivers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select(`
          *,
          orders:orders!driver_id (
            id,
            status
          )
        `)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to include active order counts
      const transformedDrivers = data?.map((driver: any) => {
        const activeOrders = driver.orders?.filter((order: any) => 
          !['Delivered', 'Canceled'].includes(order.status)
        ) || [];
        
        return {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicle_details: driver.vehicle_details,
          created_at: driver.created_at,
          active_orders_count: activeOrders.length,
          is_available: activeOrders.length === 0,
        };
      }) || [];

      setDrivers(transformedDrivers);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch if no initial data
    if (initialDrivers.length === 0) {
      fetchDrivers();
    }

    // Subscribe to driver changes
    const realtimeChannel = supabase
      .channel('drivers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
        },
        (payload: any) => {
          if (isDevelopment) {
            console.debug('Real-time driver update:', payload);
          }
          // Refetch to update active order counts
          fetchDrivers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: any) => {
          // When orders change, update driver availability
          if (isDevelopment) {
            console.debug('Order change affecting drivers:', payload);
          }
          fetchDrivers();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    drivers,
    isLoading,
    error,
    refresh: fetchDrivers,
  };
}
