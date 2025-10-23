'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { watchLocation, clearWatch } from '@/lib/google-maps/tracking';
import { usePushNotifications } from '@/app/hooks/usePushNotifications';
import { useDemo } from '@/app/demo/DemoContext';
import { 
  Package, 
  MapPin, 
  User, 
  Phone, 
  DollarSign, 
  Clock,
  CheckCircle,
  TruckIcon,
  Navigation,
  AlertCircle,
  Bell,
  BellOff
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  price_total: number;
  currency: string;
  created_at: string;
  updated_at: string;
  customers: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  quotes: {
    pickup_address?: string;
    dropoff_address?: string;
    distance_mi?: number;
  } | null;
  drivers: {
    id: string;
    name: string;
    phone?: string;
  } | null;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_details?: any;
  active_orders_count: number;
  is_available: boolean;
}

export default function DriverClient() {
  const { isDemoMode, currentDriverId, demoDrivers } = useDemo();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const locationWatchIdRef = useRef<number | null>(null);
  const lastLocationUpdateRef = useRef<number>(0);
  
  // Push notification hook
  const pushNotifications = usePushNotifications({ 
    driverId: selectedDriverId 
  });

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await fetch('/api/drivers');
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load drivers');
    }
  }, []);

  const fetchOrdersForDriver = useCallback(async (driverId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/by-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, use demo drivers
      const demoDriverList = demoDrivers.map(driver => ({
        id: driver.id,
        name: driver.name,
        phone: '(555) 123-4567',
        vehicle_details: { type: 'Van', plate: 'DEMO-123' },
        active_orders_count: 0,
        is_available: true,
      }));
      setDrivers(demoDriverList);
      
      // Auto-select the current demo driver
      if (currentDriverId) {
        setSelectedDriverId(currentDriverId);
      }
    } else {
      // In non-demo mode, only fetch if a driver is selected (avoid unnecessary load)
      setDrivers([]);
      if (selectedDriverId) {
        fetchDrivers();
      }
    }
  }, [isDemoMode, currentDriverId, demoDrivers, fetchDrivers, selectedDriverId]);

  useEffect(() => {
    if (selectedDriverId) {
      fetchOrdersForDriver(selectedDriverId);
    } else {
      setOrders([]);
    }
  }, [selectedDriverId, fetchOrdersForDriver]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(orderId);
    try {
      const requestBody = {
        status: newStatus,
        notes: `Status updated by driver via dashboard`
      };

      // Attempt online first
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(orders.map(order => 
          order.id === orderId ? data.order : order
        ));
        toast.success('Status updated!', {
          description: `Order marked as ${newStatus}`,
        });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      try {
        // Queue for background sync via service worker cache
        if ('serviceWorker' in navigator && 'caches' in window) {
          const cache = await caches.open('pending-updates');
          const request = new Request(`/api/orders/${orderId}/status`, { method: 'PATCH' });
          await cache.put(request, new Response(JSON.stringify({
            status: newStatus,
            notes: `Status updated by driver via dashboard`
          }), { headers: { 'Content-Type': 'application/json' } }));

          // Register background sync
          const registration = await navigator.serviceWorker.ready;
          if ('sync' in registration) {
            await (registration as any).sync.register('sync-status-updates');
          }

          toast.success('Offline: update queued', {
            description: 'We will sync this change when back online',
          });
        } else {
          throw new Error('Background sync not supported');
        }
      } catch (queueErr) {
        console.error('Failed to queue update for sync:', queueErr);
        toast.error('Failed to update status', {
          description: 'Please try again',
        });
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Assigned': return 'Accepted';
      case 'Accepted': return 'PickedUp';
      case 'PickedUp': return 'InTransit';
      case 'InTransit': return 'Delivered';
      default: return null;
    }
  };

  const getStatusActionLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Assigned': return { label: 'Accept Order', icon: CheckCircle };
      case 'Accepted': return { label: 'Mark Picked Up', icon: Package };
      case 'PickedUp': return { label: 'Start Transit', icon: Navigation };
      case 'InTransit': return { label: 'Mark Delivered', icon: CheckCircle };
      default: return null;
    }
  };

  const activeOrders = orders.filter(o => !['Delivered', 'Canceled'].includes(o.status));
  const completedOrders = orders.filter(o => ['Delivered', 'Canceled'].includes(o.status));

  // Start location tracking for active orders
  useEffect(() => {
    if (!selectedDriverId || activeOrders.length === 0) {
      // Stop tracking if no driver selected or no active orders
      if (locationWatchIdRef.current !== null) {
        clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
        setIsLocationTracking(false);
      }
      return;
    }

    // Start tracking location
    try {
      const watchId = watchLocation(
        (position) => {
          const now = Date.now();
          // Throttle updates to every 30 seconds
          if (now - lastLocationUpdateRef.current < 30000) {
            return;
          }
          lastLocationUpdateRef.current = now;

          // Send location update for each active order
          activeOrders.forEach(async (order) => {
            try {
              const payload = {
                driverId: selectedDriverId,
                orderId: order.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined,
              };

              const res = await fetch('/api/drivers/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });

              if (!res.ok) throw new Error('Network error');
            } catch (err) {
              console.error('Failed to update location:', err);
              try {
                if ('serviceWorker' in navigator && 'caches' in window) {
                  // Queue location update for offline sync
                  const cache = await caches.open('pending-updates');
                  const req = new Request('/api/drivers/location', { method: 'POST' });
                  await cache.put(req, new Response(JSON.stringify({ driverId: selectedDriverId, lat: position.coords.latitude, lng: position.coords.longitude }), { headers: { 'Content-Type': 'application/json' } }));
                  const registration = await navigator.serviceWorker.ready;
                  if ('sync' in registration) {
                    await (registration as any).sync.register('sync-location-updates');
                  }
                }
              } catch (queueErr) {
                console.error('Failed to queue location for sync:', queueErr);
              }
            }
          });

          setIsLocationTracking(true);
        },
        (error) => {
          console.error('Location tracking error:', error);
          toast.error('Location tracking unavailable', {
            description: 'Please enable location services in your browser',
          });
          setIsLocationTracking(false);
        }
      );

      locationWatchIdRef.current = watchId;

      return () => {
        if (watchId) {
          clearWatch(watchId);
        }
      };
    } catch (err) {
      console.error('Failed to start location tracking:', err);
      toast.error('Location tracking not supported');
    }
  }, [selectedDriverId, activeOrders]);

  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8" data-testid="driver-dashboard">
      <PageHeader
        title="Driver Dashboard"
        description="Manage your assigned deliveries with quick status updates"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Driver' },
        ]}
      />

      {/* Driver Selection (Demo Mode) */}
      {isDemoMode && (
      <Card className="mb-8 bg-muted/50 border-2 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-background p-3">
              <TruckIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <label htmlFor="driver-select" className="text-sm font-medium text-foreground mb-2 block">
                Select Driver (Demo Mode)
              </label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger id="driver-select" className="w-full max-w-md">
                  <SelectValue placeholder="Choose a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name} ({driver.active_orders_count} active orders)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Push Notification Settings */}
      {selectedDriverId && pushNotifications.isSupported && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-accent/10 p-3">
                  {pushNotifications.isSubscribed ? (
                    <Bell className="h-6 w-6 text-accent" />
                  ) : (
                    <BellOff className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Push Notifications
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pushNotifications.isSubscribed 
                      ? 'You will receive alerts for new order assignments' 
                      : 'Enable to receive instant alerts for new deliveries'}
                  </p>
                </div>
              </div>
              <Button
                variant={pushNotifications.isSubscribed ? "secondary" : "accent"}
                size="sm"
                onClick={pushNotifications.isSubscribed 
                  ? pushNotifications.unsubscribe 
                  : pushNotifications.subscribe}
                disabled={pushNotifications.isLoading}
              >
                {pushNotifications.isLoading ? 'Loading...' : 
                 pushNotifications.isSubscribed ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Section */}
      {selectedDriverId && (
        <>
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-heading-lg font-semibold">
                  Active Orders ({activeOrders.length})
                </h2>
                <Badge variant="accent" className="text-sm">
                  <TruckIcon className="h-3 w-3 mr-1" />
                  {activeOrders.length} in progress
                </Badge>
              </div>
              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  const actionData = getStatusActionLabel(order.status);
                  const ActionIcon = actionData?.icon;
                  
                  return (
                    <Card key={order.id} className="overflow-hidden hover:shadow-soft-lg transition-shadow" data-testid={`order-${order.id}`}>
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-mono">
                              Order #{order.id.slice(-8)}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Customer Info */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Customer Details
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Name:</span>
                                <span className="ml-2 font-medium">{order.customers?.name}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <span className="ml-2">{order.customers?.email}</span>
                              </div>
                              {order.customers?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <a href={`tel:${order.customers.phone}`} className="text-accent hover:underline font-medium">
                                    {order.customers.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delivery Details */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Delivery Details
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground block">Pickup:</span>
                                  <span className="font-medium">{order.quotes?.pickup_address}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-muted-foreground block">Dropoff:</span>
                                  <span className="font-medium">{order.quotes?.dropoff_address}</span>
                                </div>
                              </div>
                              {order.quotes?.distance_mi && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {order.quotes.distance_mi} miles
                                  </Badge>
                                  <Badge variant="secondary">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {order.price_total.toFixed(2)} {order.currency.toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator className="mb-4" />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Updated {new Date(order.updated_at).toLocaleString()}
                          </div>
                          {nextStatus && actionData && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="accent"
                                  size="lg"
                                  disabled={isUpdating === order.id}
                                  className="min-w-[180px]"
                                  data-testid={`update-status-${order.id}`}
                                >
                                  {isUpdating === order.id ? (
                                    'Updating...'
                                  ) : (
                                    <>
                                      {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                                      {actionData.label}
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    {ActionIcon && <ActionIcon className="h-5 w-5 text-accent" />}
                                    {actionData.label}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to update the order status to <strong>{nextStatus}</strong>? 
                                    This will notify the customer and dispatcher.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => updateOrderStatus(order.id, nextStatus)}
                                    className="bg-accent hover:bg-accent/90"
                                  >
                                    Confirm
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <h2 className="text-heading-lg font-semibold mb-4">
                Completed Orders ({completedOrders.length})
              </h2>
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <Card key={order.id} className="bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-mono text-sm font-medium">
                              #{order.id.slice(-8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.quotes?.pickup_address?.split(',')[0]} → {order.quotes?.dropoff_address?.split(',')[0]}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-medium">
                            ${order.price_total.toFixed(2)}
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {isLoading ? (
            <LoadingState message="Loading orders..." />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders assigned"
              description="This driver has no orders assigned to them. Orders will appear here once assigned by a dispatcher."
            />
          ) : null}
        </>
      )}

      {/* Location Tracking Status */}
      {selectedDriverId && activeOrders.length > 0 && (
        <Card className={`mt-6 ${isLocationTracking ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Navigation className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isLocationTracking ? 'text-success' : 'text-warning'}`} />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {isLocationTracking ? '📍 Location Tracking Active' : '⚠️ Location Tracking'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isLocationTracking 
                    ? 'Your location is being shared with customers for real-time tracking. Updates every 30 seconds.'
                    : 'Please enable location services to allow customers to track your delivery in real-time.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Support Message */}
      {selectedDriverId && orders.length > 0 && (
        <Card className="mt-6 border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Background Sync Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  Your status updates will sync automatically when you're back online. 
                  Changes are saved locally for offline reliability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
