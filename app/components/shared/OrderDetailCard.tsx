import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { MapPin, User, Phone, DollarSign, Package, Calendar } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  price_total: number;
  currency?: string;
  created_at: string | null;
  customers?: {
    name?: string | null;
    email?: string;
    phone?: string | null;
  } | null;
  quotes?: {
    pickup_address?: string;
    dropoff_address?: string;
    distance_mi?: number;
  } | null;
  drivers?: {
    name?: string;
    phone?: string;
  } | null;
}

interface OrderDetailCardProps {
  order: Order;
  showActions?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function OrderDetailCard({ order, showActions = false, actions, className }: OrderDetailCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-heading-md">
              Order #{order.id.slice(0, 8)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customer Information */}
        {order.customers && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </h4>
            <div className="pl-6 space-y-1">
              <p className="text-sm text-foreground">
                {order.customers.name || 'N/A'}
              </p>
              {order.customers.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {order.customers.phone}
                </p>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Addresses */}
        {order.quotes && (
          <div className="space-y-4">
            {/* Pickup Address */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-success" />
                Pickup
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                {order.quotes.pickup_address || 'N/A'}
              </p>
            </div>

            {/* Dropoff Address */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-destructive" />
                Dropoff
              </h4>
              <p className="text-sm text-muted-foreground pl-6">
                {order.quotes.dropoff_address || 'N/A'}
              </p>
            </div>

            {/* Distance */}
            {order.quotes.distance_mi !== undefined && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                <Package className="h-3 w-3" />
                {order.quotes.distance_mi.toFixed(1)} miles
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Price */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Total
          </h4>
          <p className="text-lg font-semibold text-foreground">
            ${order.price_total?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Actions */}
        {showActions && actions && (
          <>
            <Separator />
            <div className="space-y-2">
              {actions}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

