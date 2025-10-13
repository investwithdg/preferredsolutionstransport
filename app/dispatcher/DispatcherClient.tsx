'use client';

import { useState } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { OrderRouteModal } from '@/app/components/modals/OrderRouteModal';
import { Truck, Package, CheckCircle2, AlertCircle, Map } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicle_details?: any;
  active_orders_count: number;
  is_available: boolean;
}

interface Order {
  id: string;
  status: string;
  price_total: number;
  currency: string;
  created_at: string;
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
}

interface DispatcherClientProps {
  initialOrders: Order[];
  drivers: Driver[];
}

export default function DispatcherClient({ initialOrders, drivers }: DispatcherClientProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<{ [orderId: string]: string }>({});
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);

  const availableDrivers = drivers.filter(d => d.is_available);
  const busyDrivers = drivers.filter(d => !d.is_available);

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    if (!driverId) return;

    setIsAssigning(orderId);
    
    try {
      const response = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          driverId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign driver');
      }

      // Remove the assigned order from the list
      setOrders(orders.filter(order => order.id !== orderId));
      
      // Clear the selection
      setSelectedDriver(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });
      
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver. Please try again.');
    } finally {
      setIsAssigning(null);
    }
  };

  const handleDriverSelect = (orderId: string, driverId: string) => {
    setSelectedDriver(prev => ({
      ...prev,
      [orderId]: driverId
    }));
  };

  return (
    <div className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8" data-testid="dispatcher-dashboard">
      <PageHeader
        title="Dispatch Queue"
        description="Assign incoming orders to available drivers to minimize time-to-delivery"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dispatcher' },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">{orders.length}</p>
              </div>
              <div className="rounded-full bg-warning/10 p-3">
                <Package className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Drivers</p>
                <p className="text-2xl font-bold text-foreground mt-1">{availableDrivers.length}</p>
              </div>
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Busy Drivers</p>
                <p className="text-2xl font-bold text-foreground mt-1">{busyDrivers.length}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <Truck className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
                <p className="text-2xl font-bold text-foreground mt-1">{drivers.length}</p>
              </div>
              <div className="rounded-full bg-secondary p-3">
                <Truck className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders pending"
              description="Orders will appear here after successful payment and are ready for driver assignment."
              className="py-16"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Details</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-medium">
                            #{order.id.slice(-8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                          {order.quotes?.distance_mi && (
                            <Badge variant="secondary" className="text-xs">
                              {order.quotes.distance_mi} mi
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {order.customers?.name || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customers?.email}
                          </div>
                          {order.customers?.phone && (
                            <div className="text-xs text-muted-foreground">
                              {order.customers.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2 max-w-xs">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">From:</span>
                            <p className="text-sm">{order.quotes?.pickup_address || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">To:</span>
                            <p className="text-sm">{order.quotes?.dropoff_address || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-bold text-sm">
                            ${order.price_total.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase">
                            {order.currency}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrderForMap(order)}
                            title="View route on map"
                          >
                            <Map className="h-4 w-4" />
                          </Button>
                          <Select
                            value={selectedDriver[order.id] || ''}
                            onValueChange={(value) => handleDriverSelect(order.id, value)}
                            disabled={isAssigning === order.id}
                          >
                            <SelectTrigger className="w-[200px]" data-testid={`driver-select-${order.id}`}>
                              <SelectValue placeholder="Select Driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDrivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-success" />
                                    {driver.name}
                                  </div>
                                </SelectItem>
                              ))}
                              {busyDrivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3 text-warning" />
                                    {driver.name} ({driver.active_orders_count} active)
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="accent"
                            size="default"
                            onClick={() => handleAssignDriver(order.id, selectedDriver[order.id])}
                            disabled={!selectedDriver[order.id] || isAssigning === order.id}
                            data-testid={`assign-button-${order.id}`}
                          >
                            {isAssigning === order.id ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Route Modal */}
      {selectedOrderForMap && (
        <OrderRouteModal
          isOpen={!!selectedOrderForMap}
          onClose={() => setSelectedOrderForMap(null)}
          orderId={selectedOrderForMap.id}
          pickupAddress={selectedOrderForMap.quotes?.pickup_address || ''}
          dropoffAddress={selectedOrderForMap.quotes?.dropoff_address || ''}
          distance={selectedOrderForMap.quotes?.distance_mi}
        />
      )}
    </div>
  );
}
