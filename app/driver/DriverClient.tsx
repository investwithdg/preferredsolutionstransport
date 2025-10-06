'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { 
  Package, 
  MapPin, 
  User, 
  Phone, 
  DollarSign, 
  Clock,
  CheckCircle,
  TruckIcon
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
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch drivers on component mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  // Fetch orders when driver is selected
  useEffect(() => {
    if (selectedDriverId) {
      fetchOrdersForDriver(selectedDriverId);
    } else {
      setOrders([]);
    }
  }, [selectedDriverId]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchOrdersForDriver = async (driverId: string) => {
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
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status updated by driver via dashboard`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the local orders state
        setOrders(orders.map(order => 
          order.id === orderId ? data.order : order
        ));
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status. Please try again.');
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

  const getNextStatusLabel = (currentStatus: string) => {
    const next = getNextStatus(currentStatus);
    switch (next) {
      case 'Accepted': return 'Accept Order';
      case 'PickedUp': return 'Mark Picked Up';
      case 'InTransit': return 'Start Transit';
      case 'Delivered': return 'Mark Delivered';
      default: return null;
    }
  };

  const activeOrders = orders.filter(o => !['Delivered', 'Canceled'].includes(o.status));
  const completedOrders = orders.filter(o => ['Delivered', 'Canceled'].includes(o.status));

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

      {/* Orders Section */}
      {selectedDriverId && (
        <>
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="text-heading-lg font-semibold mb-4">
                Active Orders ({activeOrders.length})
              </h2>
              <div className="space-y-4">
                {activeOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  const nextLabel = getNextStatusLabel(order.status);
                  
                  return (
                    <Card key={order.id} className="overflow-hidden" data-testid={`order-${order.id}`}>
                      <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-mono">
                              Order #{order.id.slice(-8)}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {new Date(order.created_at).toLocaleString()}
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
                                  <a href={`tel:${order.customers.phone}`} className="text-accent hover:underline">
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
                          {nextStatus && nextLabel && (
                            <Button
                              variant="accent"
                              size="lg"
                              onClick={() => updateOrderStatus(order.id, nextStatus)}
                              disabled={isUpdating === order.id}
                              className="min-w-[180px]"
                              data-testid={`update-status-${order.id}`}
                            >
                              {isUpdating === order.id ? (
                                'Updating...'
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {nextLabel}
                                </>
                              )}
                            </Button>
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
    </div>
  );
}
