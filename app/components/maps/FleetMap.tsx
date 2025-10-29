import { useEffect, useMemo, useRef } from 'react';
// NOTE: Script loaded once globally via GoogleMapsProvider
import { geocodeAddress, createTruckMarkerIcon, type LatLng } from '@/lib/google-maps/tracking';

export type FleetMapOrder = {
  id: string;
  status: string;
  driver_id?: string | null;
  quotes?: { pickup_address?: string; dropoff_address?: string } | null;
};

export type FleetMapDriver = {
  id: string;
  name: string;
};

export type FleetMapProps = {
  orders: FleetMapOrder[];
  drivers: FleetMapDriver[];
  driverLocations: Record<string, { latitude: number; longitude: number } | undefined>;
  onSelect?: (orderId?: string, driverId?: string) => void;
};

export default function FleetMap({ orders, drivers, driverLocations, onSelect }: FleetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => !['Delivered', 'Canceled'].includes(o.status)),
    [orders]
  );

  useEffect(() => {
    // The script is already loaded once; just rely on window.google
    if (!window.google?.maps) {
      return;
    }
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 11,
        center: { lat: 40.7128, lng: -74.006 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }

    const map = mapInstanceRef.current;

    const markers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    const addMarker = (
      pos: LatLng,
      options: Omit<google.maps.MarkerOptions, 'position' | 'map'> = {}
    ) => {
      const m = new google.maps.Marker({ position: pos, map, ...options });
      markers.push(m);
      bounds.extend(pos);
      return m;
    };

    // Add pickup/dropoff for active orders
    (async () => {
      for (const o of activeOrders) {
        const pickup = o.quotes?.pickup_address;
        const drop = o.quotes?.dropoff_address;
        if (pickup) {
          const coords = await geocodeAddress(pickup);
          if (coords) {
            const m = addMarker(coords, {
              title: `Pickup #${o.id.slice(-6)}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#10b981',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              },
            });
            m.addListener('click', () => onSelect?.(o.id, o.driver_id || undefined));
          }
        }
        if (drop) {
          const coords = await geocodeAddress(drop);
          if (coords) {
            const m = addMarker(coords, {
              title: `Dropoff #${o.id.slice(-6)}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              },
            });
            m.addListener('click', () => onSelect?.(o.id, o.driver_id || undefined));
          }
        }
      }

      // Add driver pins
      for (const d of drivers) {
        const loc = driverLocations[d.id];
        if (!loc) continue;
        const pos = { lat: loc.latitude, lng: loc.longitude } as LatLng;
        const m = addMarker(pos, { title: d.name, icon: createTruckMarkerIcon() });
        m.addListener('click', () => onSelect?.(undefined, d.id));
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    })();

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [orders, drivers, driverLocations, onSelect]);

  if (!window.google?.maps) {
    return <div className="p-6 text-sm text-muted-foreground">Loading map…</div>;
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
