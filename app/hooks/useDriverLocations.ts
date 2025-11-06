'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geocodeAddress } from '@/lib/google-maps/tracking';

export type DriverLocation = {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
};

type OrderLike = {
  id: string;
  status: string;
  driver_id?: string | null;
  quotes?: { pickup_address?: string; dropoff_address?: string } | null;
};

type UseDriverLocationsArgs = {
  drivers: { id: string }[];
  orders: OrderLike[];
  pollMs?: number;
};

export function useDriverLocations({ drivers, orders, pollMs = 30000 }: UseDriverLocationsArgs) {
  const [locations, setLocations] = useState<Record<string, DriverLocation | undefined>>({});

  const activeOrdersByDriver = useMemo(() => {
    const map: Record<string, OrderLike | undefined> = {};
    for (const o of orders) {
      if (o.driver_id && !['Delivered', 'Canceled'].includes(o.status)) {
        map[o.driver_id] = o;
      }
    }
    return map;
  }, [orders]);

  const fetchOnce = useCallback(async () => {
    // Fetch latest location for each driver
    try {
      const updates: Record<string, DriverLocation | undefined> = {};
      await Promise.all(
        drivers.map(async (d) => {
          try {
            const res = await fetch(`/api/drivers/location?driverId=${d.id}`);
            if (res.ok) {
              const data = await res.json();
              const loc = data.location;
              if (loc) {
                updates[d.id] = {
                  driverId: d.id,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  heading: loc.heading || undefined,
                  speed: loc.speed || undefined,
                  updatedAt: loc.created_at,
                };
              }
            }
          } catch {}
        })
      );
      setLocations(prev => ({ ...prev, ...updates }));
    } catch {}
  }, [drivers, activeOrdersByDriver]);

  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => clearInterval(id);
  }, [fetchOnce, pollMs]);

  return { locations };
}


