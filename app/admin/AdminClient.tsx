'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { StatusBadge } from '@/app/components/shared/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { 
  LayoutDashboard, 
  Users, 
  TruckIcon, 
  Package, 
  DollarSign,
  UserPlus,
  Edit,
  Trash2,
  Settings,
  AlertCircle,
  FileText,
  Download,
  Filter
} from 'lucide-react';

type User = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicle_details?: string;
  created_at: string;
  orders?: { id: string; status: string }[];
};

type Order = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  customers: { name: string; email: string } | null;
  drivers: { name: string } | null;
};

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalDrivers: number;
  totalUsers: number;
};

type Props = {
  initialUsers: User[];
  initialDrivers: Driver[];
  initialOrders: Order[];
  stats: Stats;
};

type Tab = 'overview' | 'users' | 'drivers' | 'orders' | 'pricing' | 'logs';

export default function AdminClient({ initialUsers, initialDrivers, initialOrders, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState({
    eventType: '',
    orderId: '',
    dateFrom: '',
    dateTo: '',
  });

  const tabs = [
    { id: 'overview' as Tab, name: 'Overview', icon: LayoutDashboard },
    { id: 'users' as Tab, name: 'Users', icon: Users },
    { id: 'drivers' as Tab, name: 'Drivers', icon: TruckIcon },
    { id: 'orders' as Tab, name: 'Orders', icon: Package },
    { id: 'pricing' as Tab, name: 'Pricing', icon: DollarSign },
    { id: 'logs' as Tab, name: 'Logs & Reports', icon: FileText },
  ];

  // Fetch logs from API
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (logFilter.eventType) params.append('eventType', logFilter.eventType);
      if (logFilter.orderId) params.append('orderId', logFilter.orderId);
      if (logFilter.dateFrom) params.append('dateFrom', logFilter.dateFrom);
      if (logFilter.dateTo) params.append('dateTo', logFilter.dateTo);
      
      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Load logs when logs tab becomes active
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    if (tabId === 'logs' && logs.length === 0) {
      fetchLogs();
    }
  };

  // Export orders to CSV
  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Customer', 'Driver', 'Status', 'Amount', 'Created At'];
    const rows = initialOrders.map(order => [
      order.id.slice(0, 8),
      order.customers?.name || 'N/A',
      order.drivers?.name || 'Unassigned',
      order.status,
      `$${order.price_total?.toFixed(2) || '0.00'}`,
      new Date(order.created_at).toLocaleDateString(),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export logs to CSV
  const exportLogsCSV = () => {
    const headers = ['Event ID', 'Order ID', 'Event Type', 'Actor', 'Source', 'Created At'];
    const rows = logs.map(log => [
      log.event_id || log.id.slice(0, 8),
      log.order_id?.slice(0, 8) || 'N/A',
      log.event_type,
      log.actor,
      log.source,
      new Date(log.created_at).toLocaleString(),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8" data-testid="admin-dashboard">
      <PageHeader
        title="Admin Dashboard"
        description="Manage users, drivers, orders, and system configuration"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admin' },
        ]}
      />

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-2 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                  border-b-2 -mb-[1px]
                  ${activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stats.totalOrders}</p>
                    </div>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground mt-1">${stats.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Orders</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stats.activeOrders}</p>
                    </div>
                    <TruckIcon className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Drivers</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stats.totalDrivers}</p>
                    </div>
                    <TruckIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest delivery orders from the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialOrders.slice(0, 10).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{order.customers?.name || 'N/A'}</TableCell>
                        <TableCell>{order.drivers?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${order.price_total?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage platform users and their roles</CardDescription>
                </div>
                <Button variant="accent">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="accent" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Driver Management</CardTitle>
                  <CardDescription>Manage delivery drivers and their vehicles</CardDescription>
                </div>
                <Button variant="accent">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Driver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Active Orders</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialDrivers.map((driver) => {
                    const activeOrders = driver.orders?.filter(o => !['Delivered', 'Canceled'].includes(o.status)) || [];
                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.vehicle_details || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={activeOrders.length > 0 ? "accent" : "secondary"}>
                            {activeOrders.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View and manage all platform orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{order.customers?.name || 'N/A'}</TableCell>
                      <TableCell>{order.drivers?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="font-medium">
                        ${order.price_total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <Card>
            <CardHeader>
              <CardTitle>Pricing Configuration</CardTitle>
              <CardDescription>Manage platform pricing rules and rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl space-y-6">
                {/* Info Banner */}
                <div className="flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      Configuration Note
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Pricing is currently configured in <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">lib/config.ts</code>.
                      Future versions will support database-driven pricing rules with real-time updates.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Pricing Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="base-fee">Base Fee</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="base-fee"
                        type="number"
                        disabled
                        defaultValue="50.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="per-mile">Per Mile Rate</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="per-mile"
                        type="number"
                        disabled
                        defaultValue="2.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel-surcharge">Fuel Surcharge</Label>
                    <div className="relative">
                      <Input
                        id="fuel-surcharge"
                        type="number"
                        disabled
                        defaultValue="10"
                        className="pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button disabled variant="secondary" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Save Changes (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs & Reports Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Export Buttons */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Export Reports</CardTitle>
                    <CardDescription>Download data for analysis and record keeping</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={exportOrdersCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Orders (CSV)
                </Button>
                <Button 
                  onClick={exportLogsCSV} 
                  variant="outline" 
                  className="gap-2"
                  disabled={logs.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export Logs (CSV)
                </Button>
              </CardContent>
            </Card>

            {/* Logs Viewer */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Event Logs</CardTitle>
                    <CardDescription>View and filter all system events and activities</CardDescription>
                  </div>
                  <Button onClick={fetchLogs} variant="accent" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Refresh Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="event-type-filter">Event Type</Label>
                    <Input
                      id="event-type-filter"
                      placeholder="e.g. email_sent"
                      value={logFilter.eventType}
                      onChange={(e) => setLogFilter(prev => ({ ...prev, eventType: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-id-filter">Order ID</Label>
                    <Input
                      id="order-id-filter"
                      placeholder="Enter order ID"
                      value={logFilter.orderId}
                      onChange={(e) => setLogFilter(prev => ({ ...prev, orderId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-from-filter">Date From</Label>
                    <Input
                      id="date-from-filter"
                      type="date"
                      value={logFilter.dateFrom}
                      onChange={(e) => setLogFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-to-filter">Date To</Label>
                    <Input
                      id="date-to-filter"
                      type="date"
                      value={logFilter.dateTo}
                      onChange={(e) => setLogFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Logs Table */}
                {isLoadingLogs ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading logs...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No logs found. Click "Refresh Logs" to load system events.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {log.event_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.order_id ? `#${log.order_id.slice(0, 8)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">{log.actor}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.source}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer hover:text-foreground">
                                  View Payload
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </details>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(log.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
