'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { Badge } from '@/app/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

// Dynamically import the map component to avoid SSR issues
const OrderRouteMap = dynamic(
  () => import('@/app/components/maps/OrderRouteMap'),
  { 
    ssr: false,
    loading: () => <LoadingState message="Loading map..." />
  }
);

interface OrderRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  pickupAddress: string;
  dropoffAddress: string;
  distance?: number;
}

export function OrderRouteModal({
  isOpen,
  onClose,
  orderId,
  pickupAddress,
  dropoffAddress,
  distance,
}: OrderRouteModalProps) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load Google Maps script if not already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const loadGoogleMaps = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapsLoaded(true);
      script.onerror = () => console.error('Failed to load Google Maps');
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Order Route - #{orderId.slice(-8)}
            </DialogTitle>
            {distance && (
              <Badge variant="secondary" className="ml-4">
                {distance} miles
              </Badge>
            )}
          </div>
          <DialogDescription className="mt-2 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-medium text-muted-foreground">Pickup:</span>
                <p className="text-sm">{pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-medium text-muted-foreground">Dropoff:</span>
                <p className="text-sm">{dropoffAddress}</p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="h-[500px] relative">
          {googleMapsLoaded ? (
            <OrderRouteMap
              pickupAddress={pickupAddress}
              dropoffAddress={dropoffAddress}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <LoadingState message="Loading Google Maps..." />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
