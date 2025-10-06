'use client';

import Link from 'next/link';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { OrderCard } from '@/app/components/shared/OrderCard';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Package, Plus, Eye, TruckIcon } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Order = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  quotes: {
    pickup_address: string;
    dropoff_address: string;
    distance_mi: number;
  } | null;
  drivers: {
    name: string;
    phone: string;
  } | null;
};

type Props = {
  customer: Customer;
  orders: Order[];
};

export default function CustomerDashboardClient({ customer, orders }: Props) {
  const activeOrders = orders.filter(o => !['Delivered', 'Canceled'].includes(o.status));
  const pastOrders = orders.filter(o => ['Delivered', 'Canceled'].includes(o.status));

  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8" data-testid="customer-dashboard">
      <PageHeader
        title={`Welcome back, ${customer.name}!`}
        description="Track your deliveries and request new quotes"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'My Orders' },
        ]}
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/quote">
              <Plus className="h-4 w-4 mr-2" />
              Request New Quote
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">{activeOrders.length}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <TruckIcon className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {pastOrders.filter(o => o.status === 'Delivered').length}
                </p>
              </div>
              <div className="rounded-full bg-success/10 p-3">
                <Package className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">{orders.length}</p>
              </div>
              <div className="rounded-full bg-secondary p-3">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-heading-lg font-semibold mb-4">
            Active Orders ({activeOrders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                href={`/track/${order.id}`}
                testId={`order-card-${order.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Orders */}
      <div>
        <h2 className="text-heading-lg font-semibold mb-4">
          {activeOrders.length > 0 ? 'Order History' : 'Order History'}
        </h2>
        {pastOrders.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <span className="font-mono text-sm">
                            #{order.id.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="text-sm truncate">
                              {order.quotes?.pickup_address?.split(',')[0]} → {order.quotes?.dropoff_address?.split(',')[0]}
                            </div>
                            {order.quotes?.distance_mi && (
                              <div className="text-xs text-muted-foreground">
                                {order.quotes.distance_mi} miles
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ${order.price_total.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                          >
                            <Link href={`/track/${order.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={Package}
            title={activeOrders.length > 0 ? "No completed orders yet" : "No orders yet"}
            description="You haven't placed any orders. Start by requesting a quote for your delivery."
            action={
              <Button asChild variant="accent">
                <Link href="/quote">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Your First Quote
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
