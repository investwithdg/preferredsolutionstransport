'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateDistanceClient } from '@/lib/google-maps/distance';

export type SuggestionAlgorithm = 'nearest' | 'workload' | 'roundRobin';

export type DispatcherSettings = {
  algorithm: SuggestionAlgorithm;
};

type Driver = {
  id: string;
  name: string;
  active_orders_count?: number;
  is_available?: boolean;
};

type OrderLike = {
  id: string;
  quotes?: { pickup_address?: string; dropoff_address?: string } | null;
};

export type DriverLocation = {
  latitude: number;
  longitude: number;
};

type RankDriversArgs = {
  algorithm: SuggestionAlgorithm;
  order: OrderLike;
  drivers: Driver[];
  driverLocations?: Record<string, DriverLocation | undefined>;
};

const STORAGE_KEY = 'dispatcher-settings';

export function useDispatcherSettings() {
  const [settings, setSettings] = useState<DispatcherSettings>({ algorithm: 'nearest' });

  // Load persisted settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DispatcherSettings;
        setSettings(parsed);
      }
    } catch (_) {}
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  const setAlgorithm = useCallback((algorithm: SuggestionAlgorithm) => {
    setSettings(prev => ({ ...prev, algorithm }));
  }, []);

  const getSuggestions = useCallback(async (args: RankDriversArgs): Promise<Driver[]> => {
    const { algorithm, order, drivers, driverLocations } = args;
    const available = drivers.filter(d => d.is_available !== false);

    if (available.length === 0) return drivers.slice(0, 3);

    if (algorithm === 'workload') {
      return available
        .slice()
        .sort((a, b) => (a.active_orders_count || 0) - (b.active_orders_count || 0))
        .slice(0, 3);
    }

    if (algorithm === 'roundRobin') {
      const lastIndexRaw = localStorage.getItem('dispatcher-rr-index');
      const lastIndex = lastIndexRaw ? parseInt(lastIndexRaw, 10) : -1;
      const next = (lastIndex + 1) % available.length;
      localStorage.setItem('dispatcher-rr-index', String(next));
      // Return next three in cycle order
      const cycle: Driver[] = [];
      for (let i = 0; i < Math.min(3, available.length); i++) {
        const idx = (next + i) % available.length;
        cycle.push(available[idx]);
      }
      return cycle;
    }

    // Nearest: requires pickup address and driver locations
    const pickup = order.quotes?.pickup_address;
    if (!pickup || !driverLocations || Object.keys(driverLocations).length === 0) {
      // Fallback to workload if distance not computable
      return available
        .slice()
        .sort((a, b) => (a.active_orders_count || 0) - (b.active_orders_count || 0))
        .slice(0, 3);
    }

    // Try to compute distance using client Google API; fallback to workload per-driver if fails
    const scored: Array<{ driver: Driver; distance: number }> = [];
    for (const d of available) {
      const loc = driverLocations[d.id];
      if (!loc) continue;
      try {
        // Use client API when available; origin string as `${lat},${lng}`
        const origin = `${loc.latitude},${loc.longitude}`;
        const result = await calculateDistanceClient(origin, pickup);
        scored.push({ driver: d, distance: result.distanceMiles });
      } catch (_) {
        // If Google not loaded, break and fallback below
      }
    }

    if (scored.length > 0) {
      return scored
        .sort((a, b) => a.distance - b.distance)
        .map(s => s.driver)
        .slice(0, 3);
    }

    // Final fallback: workload
    return available
      .slice()
      .sort((a, b) => (a.active_orders_count || 0) - (b.active_orders_count || 0))
      .slice(0, 3);
  }, []);

  return useMemo(() => ({ settings, setAlgorithm, getSuggestions }), [settings, setAlgorithm, getSuggestions]);
}


