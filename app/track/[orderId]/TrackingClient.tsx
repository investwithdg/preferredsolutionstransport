'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Label } from '@/app/components/ui/label';
import { 
  MapPin, 
  User, 
  Phone, 
  Package, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  TruckIcon,
  Mail,
  Navigation,
  AlertCircle
} from 'lucide-react';

const LiveTrackingMap = dynamic(
  () => import('@/app/components/maps/LiveTrackingMap'),
  { ssr: false }
);

// Format date to "MMM d, h:mm a" format
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

type Order = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  updated_at: string;
  customers: {
    name: string;
    email: string;
    phone: string;
  } | null;
  quotes: {
    pickup_address: string;
    dropoff_address: string;
    distance_mi: number;
  } | null;
  drivers: {
    id: string;
    name: string;
    phone: string;
  } | null;
  delivery_exception_type?: string;
  delivery_exception_notes?: string;
  delivery_resolution_status?: string;
  scheduled_pickup_time?: string;
  scheduled_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
};

type Event = {
  id: string;
  event_type: string;
  created_at: string;
  actor: string;
  payload?: any;
};

type Props = {
  order: Order;
  events: Event[];
};

export default function TrackingClient({ order, events }: Props) {
  const statuses = ['ReadyForDispatch', 'Assigned', 'PickedUp', 'InTransit', 'Delivered'];
  const currentStatusIndex = statuses.indexOf(order.status);
  const progressPercentage = ((currentStatusIndex + 1) / statuses.length) * 100;

  const statusSteps = [
    { key: 'ReadyForDispatch', label: 'Ready for Dispatch', icon: Package },
    { key: 'Assigned', label: 'Driver Assigned', icon: User },
    { key: 'PickedUp', label: 'Picked Up', icon: CheckCircle2 },
    { key: 'InTransit', label: 'In Transit', icon: TruckIcon },
    { key: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-[1200px] mx-auto" data-testid="tracking-page">
        <PageHeader
          title="Track Your Order"
          description={`Order #${order.id.slice(0, 8)}`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Track Order' },
          ]}
          action={<StatusBadge status={order.status} />}
        />

        {/* Progress Tracker */}
        <Card className="mb-8 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-accent" />
              Delivery Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pt-6 pb-2">
              {/* Progress Line Background */}
              <div className="absolute top-12 left-0 w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-success transition-all duration-700 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {/* Status Steps */}
              <div className="relative flex justify-between">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center z-10">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300
                          ${isCompleted
                            ? 'bg-gradient-to-br from-accent to-accent/80 text-white shadow-soft-lg'
                            : 'bg-muted text-muted-foreground'
                          }
                          ${isCurrent ? 'ring-4 ring-accent/30 scale-110' : ''}
                        `}
                      >
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <p className={`
                        text-xs text-center max-w-[80px] font-medium
                        ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                      `}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exception Badge */}
        {order.status === 'Canceled' && order.delivery_exception_type && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900">Delivery Exception</h4>
                <p className="text-sm text-red-700 mt-1">
                  Type: {order.delivery_exception_type.replace(/_/g, ' ')}
                </p>
                {order.delivery_exception_notes && (
                  <p className="text-sm text-red-700 mt-1">
                    Details: {order.delivery_exception_notes}
                  </p>
                )}
                {order.delivery_resolution_status && (
                  <p className="text-sm text-red-700 mt-1">
                    Status: {order.delivery_resolution_status}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-success/10 p-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Pickup</p>
                    <p className="text-sm font-medium text-foreground break-words">
                      {order.quotes?.pickup_address || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-destructive/10 p-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Dropoff</p>
                    <p className="text-sm font-medium text-foreground break-words">
                      {order.quotes?.dropoff_address || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Distance</span>
                <Badge variant="secondary">
                  {order.quotes?.distance_mi || 'N/A'} miles
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-accent" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.drivers ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-accent/10 p-3">
                      <User className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Driver Name</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.drivers.name}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-success/10 p-3">
                      <Phone className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contact Driver</p>
                      <a 
                        href={`tel:${order.drivers.phone}`} 
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        {order.drivers.phone}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-muted p-4 inline-flex mb-3">
                    <TruckIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    No driver assigned yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A driver will be assigned shortly
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </span>
                <span className="text-lg font-bold text-foreground">
                  ${order.price_total.toFixed(2)}
                </span>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Order Date
                  </span>
                  <span className="text-foreground font-medium">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Update
                  </span>
                  <span className="text-foreground font-medium">
                    {new Date(order.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Time Information */}
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Scheduled Pickup</Label>
                  <p className="text-sm font-medium mt-1">
                    {order.scheduled_pickup_time 
                      ? formatDateTime(new Date(order.scheduled_pickup_time))
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Pickup</Label>
                  <p className="text-sm font-medium mt-1">
                    {order.actual_pickup_time
                      ? formatDateTime(new Date(order.actual_pickup_time))
                      : 'Pending'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Scheduled Delivery</Label>
                  <p className="text-sm font-medium mt-1">
                    {order.scheduled_delivery_time
                      ? formatDateTime(new Date(order.scheduled_delivery_time))
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Delivery</Label>
                  <p className="text-sm font-medium mt-1">
                    {order.actual_delivery_time
                      ? formatDateTime(new Date(order.actual_delivery_time))
                      : 'Pending'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-6">
                {events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <div className="w-3 h-3 bg-accent rounded-full" />
                      </div>
                      {index < events.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {formatEventType(event.event_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {event.payload && (
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {event.actor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Support */}
        <Card className="mt-6 bg-accent/5 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-accent/10 p-3">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Need Help?
                </h3>
                <p className="text-sm text-muted-foreground">
                  If you have any questions about your order, please contact us at{' '}
                  <a 
                    href="mailto:support@preferredsolutions.com" 
                    className="text-accent font-medium hover:underline"
                  >
                    support@preferredsolutions.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Map Tracking */}
        {order.drivers && ['Assigned', 'Accepted', 'PickedUp', 'InTransit'].includes(order.status) && (
          <div className="mt-6">
            <h2 className="text-heading-lg font-semibold mb-4">Live Tracking</h2>
            <LiveTrackingMap
              orderId={order.id}
              driverId={order.drivers.id}
              pickupAddress={order.quotes?.pickup_address || ''}
              dropoffAddress={order.quotes?.dropoff_address || ''}
              orderStatus={order.status}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatEventType(eventType: string): string {
  const formats: Record<string, string> = {
    payment_completed: 'Payment Received',
    driver_assigned: 'Driver Assigned',
    status_updated: 'Status Updated',
    picked_up: 'Package Picked Up',
    in_transit: 'Package In Transit',
    delivered: 'Package Delivered',
  };

  return formats[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
