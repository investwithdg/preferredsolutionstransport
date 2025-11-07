'use client';

import { useCallback, useEffect, useState } from 'react';

export type DriverLocation = {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
};

type UseDriverLocationsArgs = {
  drivers: { id: string }[];
  orders?: unknown[]; // Kept for API compatibility but not used internally
  pollMs?: number;
};

export function useDriverLocations({ drivers, orders: _orders, pollMs = 30000 }: UseDriverLocationsArgs) {
  const [locations, setLocations] = useState<Record<string, DriverLocation | undefined>>({});

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
  }, [drivers]);

  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, pollMs);
    return () => clearInterval(id);
  }, [fetchOnce, pollMs]);

  return { locations };
}


