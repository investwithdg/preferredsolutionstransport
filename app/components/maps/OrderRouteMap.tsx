'use client';

import { useEffect, useRef, useState } from 'react';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface OrderRouteMapProps {
  pickupAddress: string;
  dropoffAddress: string;
}

export default function OrderRouteMap({ pickupAddress, dropoffAddress }: OrderRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const loadMap = async () => {
      try {
        // Check if Google Maps is already loaded
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps not loaded');
        }

        if (!mapRef.current) return;

        // Initialize map centered on a default location
        const map = new google.maps.Map(mapRef.current, {
          zoom: 12,
          center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Initialize directions service and renderer
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#3b82f6', // Blue color
            strokeWeight: 6,
            strokeOpacity: 0.8,
          },
        });

        // Calculate and display route
        calculateRoute();
        
      } catch (err) {
        console.error('Error loading map:', err);
        setError('Failed to load map');
      } finally {
        setIsLoading(false);
      }
    };

    const calculateRoute = () => {
      if (!directionsServiceRef.current || !directionsRendererRef.current) return;

      const request: google.maps.DirectionsRequest = {
        origin: pickupAddress,
        destination: dropoffAddress,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
      };

      directionsServiceRef.current.route(request, (result, status) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current!.setDirections(result);
          
          // Get distance and duration
          const route = result.routes[0];
          if (route && route.legs[0]) {
            const leg = route.legs[0];
            console.log('Distance:', leg.distance?.text);
            console.log('Duration:', leg.duration?.text);
          }
        } else {
          console.error('Directions request failed:', status);
          setError(`Could not calculate route: ${status}`);
        }
      });
    };

    // Load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      // Wait for Google Maps to be loaded by the parent component
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          loadMap();
        }
      }, 100);

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        setError('Google Maps failed to load');
        setIsLoading(false);
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    } else {
      loadMap();
    }
  }, [pickupAddress, dropoffAddress]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <LoadingState message="Loading map..." />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
