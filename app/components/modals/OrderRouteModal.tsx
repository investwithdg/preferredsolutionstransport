'use client';

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
          <OrderRouteMap
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
