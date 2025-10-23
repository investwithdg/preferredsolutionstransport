'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
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
import { getDealPipelineForStatus } from '@/lib/hubspot/property-mappings';
import { useRealtimeOrders } from '@/app/hooks/useRealtimeOrders';
import { useRealtimeDrivers } from '@/app/hooks/useRealtimeDrivers';
import { RealtimeIndicator } from '@/app/components/shared/SyncStatusIndicator';
import { DispatcherSidebar } from './DispatcherSidebar';
import FleetMap from '@/app/components/maps/FleetMap';
import { useDriverLocations } from '@/app/hooks/useDriverLocations';
import { Input } from '@/app/components/ui/input';
import { Select as UiSelect, SelectContent as UiSelectContent, SelectItem as UiSelectItem, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue } from '@/app/components/ui/select';
import { Download, Filter } from 'lucide-react';
import { useDispatcherSettings } from '@/app/hooks/useDispatcherSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { useDemo } from '@/app/demo/DemoContext';

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
  currency?: string | null;
  created_at: string | null;
  updated_at?: string | null;
  hubspot_deal_id?: string | null;
  customers?: {
    id?: string;
    name?: string | null;
    email?: string;
    phone?: string | null;
    hubspot_contact_id?: string | null;
    created_at?: string | null;
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

interface DispatcherClientProps {
  initialOrders: Order[];
  drivers: Driver[];
}

export default function DispatcherClient({ initialOrders, drivers: initialDrivers }: DispatcherClientProps) {
  const { isDemoMode } = useDemo();
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<{ [orderId: string]: string }>({});
  const [selectedOrderForMap, setSelectedOrderForMap] = useState<Order | null>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ReadyForDispatch' | 'Assigned' | 'Accepted' | 'PickedUp' | 'InTransit'>('all');
  const [isMapOpen, setIsMapOpen] = useState(true);
  const { settings, getSuggestions } = useDispatcherSettings();
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkDriver, setBulkDriver] = useState<string>('');
  const [issueOrder, setIssueOrder] = useState<Order | null>(null);
  
  // Real-time subscriptions
  const { orders, lastUpdate } = useRealtimeOrders({
    status: 'ReadyForDispatch',
    initialOrders: isDemoMode ? localOrders : initialOrders,
  });
  
  const { drivers } = useRealtimeDrivers(initialDrivers);
  const driverLocationsHook = useDriverLocations({ drivers, orders });
  const driverLocations = driverLocationsHook.locations;

  const availableDrivers = drivers.filter(d => d.is_available);
  const busyDrivers = drivers.filter(d => !d.is_available);

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    if (!driverId) return;

    setIsAssigning(orderId);
    
    try {
      if (isDemoMode) {
        // Local assign: move order out of ReadyForDispatch list
        setLocalOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
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

        // Real-time subscription will automatically update the list
      }

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

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.quotes?.pickup_address?.toLowerCase().includes(q) ||
      o.quotes?.dropoff_address?.toLowerCase().includes(q) ||
      (o.customers?.name || '').toLowerCase().includes(q) ||
      (o.drivers?.name || '').toLowerCase().includes(q)
    );
  });

  const allSelectedOnPage = useMemo(() => filteredOrders.length > 0 && filteredOrders.every(o => selectedIds[o.id]), [filteredOrders, selectedIds]);
  const anySelected = useMemo(() => Object.values(selectedIds).some(Boolean), [selectedIds]);

  const toggleSelectAll = (checked: boolean) => {
    const update: Record<string, boolean> = { ...selectedIds };
    filteredOrders.forEach(o => { update[o.id] = checked; });
    setSelectedIds(update);
  };

  const statusRowClass = (status: string) => {
    switch (status) {
      case 'ReadyForDispatch': return 'border-l-4 border-warning/60 bg-warning/5';
      case 'Assigned':
      case 'Accepted': return 'border-l-4 border-accent/60 bg-accent/5';
      case 'PickedUp':
      case 'InTransit': return 'border-l-4 border-secondary/60 bg-secondary/5';
      case 'Delivered': return 'border-l-4 border-success/60 bg-success/5';
      case 'Canceled': return 'border-l-4 border-destructive/60 bg-destructive/5';
      default: return '';
    }
  };

  const handleBulkAssign = async () => {
    const ids = Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    if (!bulkDriver) {
      toast.error('Select a driver for bulk assign');
      return;
    }
    setIsAssigning('bulk');
    try {
      await Promise.all(ids.map((id) => handleAssignDriver(id, bulkDriver)));
      toast.success(`Assigned ${ids.length} orders`);
      setSelectedIds({});
    } finally {
      setIsAssigning(null);
    }
  };

  const handleBulkAutoAssign = async () => {
    const ids = Object.entries(selectedIds).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    setIsAssigning('bulk');
    try {
      for (const id of ids) {
        const order = orders.find(o => o.id === id);
        if (!order) continue;
        const suggestions = await getSuggestions({ algorithm: settings.algorithm, order, drivers, driverLocations });
        const pick = suggestions[0];
        if (pick) await handleAssignDriver(id, pick.id);
      }
      toast.success(`Auto-assigned ${ids.length} orders`);
      setSelectedIds({});
    } finally {
      setIsAssigning(null);
    }
  };

  return (
    <div className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8" data-testid="dispatcher-dashboard">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        <div>
          <DispatcherSidebar />
        </div>
        <div>
          <div className="flex items-center justify-between mb-6">
            <PageHeader
              title="Dispatch Queue"
              description="Assign incoming orders to available drivers to minimize time-to-delivery"
              breadcrumbs={[
                { label: 'Home', href: '/' },
                { label: 'Dispatcher' },
              ]}
            />
            <RealtimeIndicator isActive={true} lastUpdate={lastUpdate} />
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div className="flex items-center gap-2 flex-1">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search orders, address, customer, driver..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <UiSelect value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <UiSelectTrigger className="w-[220px]"><UiSelectValue placeholder="Status" /></UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem value="all">All</UiSelectItem>
                    <UiSelectItem value="ReadyForDispatch">Ready</UiSelectItem>
                    <UiSelectItem value="Assigned">Assigned</UiSelectItem>
                    <UiSelectItem value="Accepted">Accepted</UiSelectItem>
                    <UiSelectItem value="PickedUp">Picked Up</UiSelectItem>
                    <UiSelectItem value="InTransit">In Transit</UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
                <Button variant="outline" className="gap-2" onClick={() => exportCSV(filteredOrders)}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant={isMapOpen ? 'secondary' : 'accent'} onClick={() => setIsMapOpen(v => !v)}>
                  {isMapOpen ? 'Hide Map' : 'Show Map'}
                </Button>
              </div>
              {filteredOrders.length > 0 && (
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mt-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" checked={allSelectedOnPage} onChange={(e) => toggleSelectAll(e.target.checked)} />
                    <span className="text-sm text-muted-foreground">Select all on page</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <UiSelect value={bulkDriver} onValueChange={setBulkDriver}>
                      <UiSelectTrigger className="w-[220px]"><UiSelectValue placeholder="Assign to driver" /></UiSelectTrigger>
                      <UiSelectContent>
                        {drivers.map((d) => (
                          <UiSelectItem key={d.id} value={d.id}>{d.name}</UiSelectItem>
                        ))}
                      </UiSelectContent>
                    </UiSelect>
                    <Button variant="accent" disabled={!anySelected || !bulkDriver || isAssigning === 'bulk'} onClick={handleBulkAssign}>Assign Selected</Button>
                    <Button variant="secondary" disabled={!anySelected || isAssigning === 'bulk'} onClick={handleBulkAutoAssign}>Auto-assign Selected</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

      {/* Orders Table + Map Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
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
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} data-testid={`order-row-${order.id}`} className={statusRowClass(order.status)}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm font-medium">
                            #{order.id.slice(-8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
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
                        <Badge variant="secondary">
                          {getDealPipelineForStatus(order.status)}
                        </Badge>
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
                          <input type="checkbox" className="h-4 w-4" checked={!!selectedIds[order.id]} onChange={(e) => setSelectedIds(prev => ({ ...prev, [order.id]: e.target.checked }))} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrderForMap(order)}
                            title="View route on map"
                          >
                            <Map className="h-4 w-4" />
                          </Button>
                          {/* Smart suggestions chips */}
                          <SuggestionChips order={order} drivers={drivers} algorithm={settings.algorithm} getSuggestions={getSuggestions} driverLocations={driverLocations} onPick={(driverId) => handleAssignDriver(order.id, driverId)} />
                          {/* Contact actions */}
                          {order.customers?.phone && (
                            <Button asChild variant="ghost" size="sm" title="Call customer">
                              <a href={`tel:${order.customers.phone}`}>Call</a>
                            </Button>
                          )}
                          {order.customers?.email && (
                            <Button asChild variant="ghost" size="sm" title="Email customer">
                              <a href={`mailto:${order.customers.email}`}>Email</a>
                            </Button>
                          )}
                          {order.drivers?.phone && (
                            <Button asChild variant="ghost" size="sm" title="Call driver">
                              <a href={`tel:${order.drivers.phone}`}>Driver</a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setIssueOrder(order)} title="Flag / Hold / Cancel">
                            Issues
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

        {/* Fleet Map Panel */}
        {isMapOpen && (
          <Card id="map" className="h-[600px] sticky top-24">
            <CardContent className="p-0 h-full">
              <FleetMap
                orders={orders as any}
                drivers={drivers as any}
                driverLocations={driverLocations}
                onSelect={(orderId, driverId) => {
                  if (orderId) {
                    const found = orders.find(o => o.id === orderId);
                    if (found) setSelectedOrderForMap(found);
                  }
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* Issues Dialog */}
      {issueOrder && (
        <Dialog open={!!issueOrder} onOpenChange={() => setIssueOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Actions - #{issueOrder.id.slice(-8)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Button className="w-full" variant="outline" onClick={() => { toast.success('Issue flagged'); setIssueOrder(null); }}>Flag Issue</Button>
              <Button className="w-full" variant="outline" onClick={() => { toast.success('Order placed on hold'); setIssueOrder(null); }}>Put On Hold</Button>
              <Button className="w-full" variant="destructive" onClick={() => { toast.success('Order canceled'); setIssueOrder(null); }}>Cancel Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Notifications & Audit Sections */}
      <div id="notifications" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <Badge variant="secondary">Live</Badge>
            </div>
            <p className="text-xs text-muted-foreground">No new notifications</p>
          </CardContent>
        </Card>
        <AuditPanel />
      </div>
        </div>
      </div>
    </div>
  );
}

function exportCSV(orders: any[]) {
  const headers = ['Order ID','Customer','Driver','Status','Amount','Created At'];
  const rows = orders.map((o) => [o.id.slice(0,8), o.customers?.name || 'N/A', o.drivers?.name || 'Unassigned', o.status, `$${o.price_total?.toFixed(2) || '0.00'}`, o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A']);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dispatch-orders-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SuggestionChips({ order, drivers, algorithm, getSuggestions, driverLocations, onPick }: { order: any; drivers: any[]; algorithm: any; getSuggestions: any; driverLocations: any; onPick: (driverId: string) => void; }) {
  const [suggested, setSuggested] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const top = await getSuggestions({ algorithm, order, drivers, driverLocations });
      setSuggested(top);
    })();
  }, [order?.id, drivers, driverLocations, getSuggestions, algorithm]);
  if (!suggested.length) return null;
  return (
    <div className="flex items-center gap-1 mr-2">
      {suggested.map((d) => (
        <Button key={d.id} variant="secondary" size="sm" onClick={() => onPick(d.id)}>{d.name}</Button>
      ))}
    </div>
  );
}

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card id="audit">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Audit Log</h3>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No audit events</p>
        ) : (
          <div className="text-xs max-h-64 overflow-auto space-y-1">
            {logs.slice(0, 50).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border/50 py-1">
                <span className="font-mono">{l.event_type}</span>
                <span className="text-muted-foreground">{l.created_at ? new Date(l.created_at).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
