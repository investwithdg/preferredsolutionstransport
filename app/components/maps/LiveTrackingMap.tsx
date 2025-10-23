'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
// NOTE: Script loaded once globally via GoogleMapsProvider
import { calculateDistanceMiles, calculateETA, formatETA, geocodeAddress, createTruckMarkerIcon, type LatLng, type DriverLocation } from '@/lib/google-maps/tracking';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { MapPin, Clock, Navigation, AlertCircle } from 'lucide-react';

type LiveTrackingMapProps = {
  orderId: string;
  driverId?: string;
  pickupAddress: string;
  dropoffAddress: string;
  orderStatus: string;
};

export default function LiveTrackingMap({
  orderId,
  driverId,
  pickupAddress,
  dropoffAddress,
  orderStatus,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  
  const markersRef = useRef<{
    pickup?: google.maps.Marker;
    dropoff?: google.maps.Marker;
    driver?: google.maps.Marker;
  }>({});
  
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isLoaded = !!window.google?.maps;
  const loadError = undefined as any;

  // Initialize Google Maps
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      zoom: 12,
      center: { lat: 37.7749, lng: -122.4194 }, // Default to SF
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(mapInstance);
  }, [isLoaded]);

  // Geocode addresses and place markers
  useEffect(() => {
    if (!map) return;

    const initializeMarkers = async () => {
      try {
        // Geocode pickup address
        const pickupCoords = await geocodeAddress(pickupAddress);
        if (pickupCoords) {
          markersRef.current.pickup = new google.maps.Marker({
            position: pickupCoords,
            map,
            title: 'Pickup Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        }

        // Geocode dropoff address
        const dropoffCoords = await geocodeAddress(dropoffAddress);
        if (dropoffCoords) {
          markersRef.current.dropoff = new google.maps.Marker({
            position: dropoffCoords,
            map,
            title: 'Dropoff Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        }

        // Fit bounds to show both markers
        if (pickupCoords && dropoffCoords) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(pickupCoords);
          bounds.extend(dropoffCoords);
          map.fitBounds(bounds);
          
          // Draw route line
          routeLineRef.current = new google.maps.Polyline({
            path: [pickupCoords, dropoffCoords],
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.6,
            strokeWeight: 3,
            map,
          });
        }
      } catch (err) {
        console.error('Error initializing markers:', err);
      }
    };

    initializeMarkers();

    return () => {
      // Cleanup markers
      const markers = markersRef.current;
      markers.pickup?.setMap(null);
      markers.dropoff?.setMap(null);
      markers.driver?.setMap(null);
      routeLineRef.current?.setMap(null);
    };
  }, [map, pickupAddress, dropoffAddress]);

  // Update driver marker on map
  const updateDriverMarker = useCallback((location: DriverLocation) => {
    if (!map) return;

    const driverCoords: LatLng = {
      lat: location.latitude,
      lng: location.longitude,
    };

    // Remove old marker
    markersRef.current.driver?.setMap(null);

    // Create new marker
    markersRef.current.driver = new google.maps.Marker({
      position: driverCoords,
      map,
      title: 'Driver Location',
      icon: createTruckMarkerIcon(location.heading),
    });

    // Calculate ETA to dropoff
    const dropoffMarker = markersRef.current.dropoff;
    if (dropoffMarker) {
      const dropoffCoords = {
        lat: dropoffMarker.getPosition()!.lat(),
        lng: dropoffMarker.getPosition()!.lng(),
      };
      const distance = calculateDistanceMiles(driverCoords, dropoffCoords);
      const etaMinutes = calculateETA(distance);
      setEta(formatETA(etaMinutes));
    }

    // Pan map to show driver
    map.panTo(driverCoords);
  }, [map]);

  // Fetch and update driver location
  useEffect(() => {
    if (!map || !driverId || !['Assigned', 'Accepted', 'PickedUp', 'InTransit'].includes(orderStatus)) {
      return;
    }

    const fetchDriverLocation = async () => {
      try {
        const response = await fetch(`/api/drivers/location?driverId=${driverId}&orderId=${orderId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.location) {
            setDriverLocation(data.location);
            updateDriverMarker(data.location);
          }
        }
      } catch (err) {
        console.error('Error fetching driver location:', err);
      }
    };

    // Fetch immediately
    fetchDriverLocation();

    // Then poll every 30 seconds
    const interval = setInterval(fetchDriverLocation, 30000);

    return () => clearInterval(interval);
  }, [map, driverId, orderId, orderStatus, updateDriverMarker]);

  if (!apiKey) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Google Maps API key not configured.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Map Unavailable</p>
          <p className="text-sm text-muted-foreground">
            {!apiKey 
              ? 'Google Maps API key not configured' 
              : 'Failed to load Google Maps'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Stats */}
      {driverLocation && eta && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-2">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                <p className="text-lg font-bold text-foreground">{eta}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-success/10 p-2">
                <Navigation className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Driver Status</p>
                <Badge variant="accent" className="mt-1">En Route</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapRef} 
            className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden"
          />
        </CardContent>
      </Card>

      {/* Map Legend */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Dropoff</span>
            </div>
            {driverLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-muted-foreground">Driver</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

