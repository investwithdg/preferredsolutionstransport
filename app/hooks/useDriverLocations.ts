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
  const isDemoMode = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  const simStateRef = useRef<Record<string, { t: number; from?: google.maps.LatLngLiteral; to?: google.maps.LatLngLiteral }>>({});

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
    if (isDemoMode) {
      // Simulate motion between pickup and dropoff per driver with active order
      const updates: Record<string, DriverLocation> = {};
      for (const d of drivers) {
        const active = activeOrdersByDriver[d.id];
        if (!active) continue;
        const pickup = active.quotes?.pickup_address;
        const drop = active.quotes?.dropoff_address;
        if (!pickup || !drop) continue;

        // Ensure from/to cached per driver
        const sim = simStateRef.current[d.id] || { t: 0 };
        if (!sim.from || !sim.to) {
          try {
            const from = await geocodeAddress(pickup);
            const to = await geocodeAddress(drop);
            if (from && to) {
              sim.from = from;
              sim.to = to;
            }
          } catch {}
        }

        if (sim.from && sim.to) {
          // Advance along the line (0->1), ping-pong
          sim.t += 0.1;
          if (sim.t > 1) sim.t = 0;
          const lat = sim.from.lat + (sim.to.lat - sim.from.lat) * sim.t;
          const lng = sim.from.lng + (sim.to.lng - sim.from.lng) * sim.t;
          updates[d.id] = {
            driverId: d.id,
            latitude: lat,
            longitude: lng,
            updatedAt: new Date().toISOString(),
          };
        }
        simStateRef.current[d.id] = sim;
      }
      setLocations(prev => ({ ...prev, ...updates }));
      return;
    }

    // Production: fetch latest location for each driver
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
  }, [drivers, activeOrdersByDriver, isDemoMode]);

  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => clearInterval(id);
  }, [fetchOnce, pollMs]);

  return { locations };
}


