'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
  Filter,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

type User = {
  id: string;
  auth_id?: string;
  email: string;
  role: string;
  created_at: string;
  banned?: boolean;
  email_confirmed?: boolean;
  last_sign_in_at?: string;
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

function HealthStatusItem({
  title,
  description,
  ok,
  extra,
}: {
  title: string;
  description: string;
  ok: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-soft-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Badge variant={ok ? 'success' : 'destructive'} className="uppercase">
          {ok ? 'Connected' : 'Check'}
        </Badge>
      </div>
      {extra}
    </div>
  );
}

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
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [integrationsHealth, setIntegrationsHealth] = useState<any | null>(null);
  const [databaseHealth, setDatabaseHealth] = useState<any | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // User management state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'recipient' as 'admin' | 'dispatcher' | 'driver' | 'recipient',
    name: '',
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

  const fetchHealth = async () => {
    setIsHealthLoading(true);
    setHealthError(null);
    try {
      const [basicHealth, integrationsHealth, databaseHealth] = await Promise.all([
        fetch('/api/admin/health').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/health/integrations').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/health/database').then((r) => (r.ok ? r.json() : null)),
      ]);

      setSystemHealth(basicHealth);
      setIntegrationsHealth(integrationsHealth);
      setDatabaseHealth(databaseHealth);
    } catch (error) {
      console.error('Error fetching system health:', error);
      setHealthError(error instanceof Error ? error.message : 'Unable to load system health');
    } finally {
      setIsHealthLoading(false);
    }
  };

  // Load logs when logs tab becomes active
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    if (tabId === 'logs' && logs.length === 0) {
      fetchLogs();
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // User Management Functions
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      toast.success('User created successfully');
      setIsCreateUserOpen(false);
      setNewUser({ email: '', password: '', role: 'recipient', name: '' });
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      toast.success('User role updated');
      await fetchUsers();
      setIsEditUserOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'ban' }),
      });

      if (!response.ok) {
        throw new Error('Failed to ban user');
      }

      toast.success('User banned');
      await fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      toast.success('User deleted');
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Export orders to CSV
  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'Customer', 'Driver', 'Status', 'Amount', 'Created At'];
    const rows = initialOrders.map((order) => [
      order.id.slice(0, 8),
      order.customers?.name || 'N/A',
      order.drivers?.name || 'Unassigned',
      order.status,
      `$${order.price_total?.toFixed(2) || '0.00'}`,
      order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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
    const rows = logs.map((log) => [
      log.event_id || log.id.slice(0, 8),
      log.order_id?.slice(0, 8) || 'N/A',
      log.event_type,
      log.actor,
      log.source,
      log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
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
    <div
      className="container max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8"
      data-testid="admin-dashboard"
    >
      <PageHeader
        title="Admin Dashboard"
        description="Manage users, drivers, orders, and system configuration"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Admin' }]}
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
                  ${
                    activeTab === tab.id
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
                      <p className="text-2xl font-bold text-foreground mt-1">
                        ${stats.totalRevenue.toFixed(2)}
                      </p>
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
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stats.activeOrders}
                      </p>
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
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stats.totalDrivers}
                      </p>
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

            {/* System Health */}
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Connection status for core integrations</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isHealthLoading && (
                    <Badge variant="secondary" className="uppercase">
                      Checking…
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHealth}
                    disabled={isHealthLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {systemHealth ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <HealthStatusItem
                      title="Database"
                      description="Supabase connectivity"
                      ok={!!systemHealth.database?.ok}
                      extra={
                        databaseHealth?.tables && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Orders:</span>
                              <span className="font-medium">{databaseHealth.tables.orders}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Customers:</span>
                              <span className="font-medium">{databaseHealth.tables.customers}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Drivers:</span>
                              <span className="font-medium">{databaseHealth.tables.drivers}</span>
                            </div>
                          </div>
                        )
                      }
                    />
                    <HealthStatusItem
                      title="HubSpot"
                      description={
                        integrationsHealth?.integrations?.hubspot?.status === 'healthy'
                          ? 'Connected'
                          : systemHealth.hubspot?.missing?.length
                            ? `Missing: ${systemHealth.hubspot.missing.join(', ')}`
                            : 'Private app token & pipeline detected'
                      }
                      ok={
                        !!systemHealth.hubspot?.configured &&
                        integrationsHealth?.integrations?.hubspot?.status !== 'unhealthy'
                      }
                      extra={
                        integrationsHealth?.integrations?.hubspot?.metadata && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Contacts:</span>
                              <span className="font-medium">
                                {integrationsHealth.integrations.hubspot.metadata.totalContacts}
                              </span>
                            </div>
                            {integrationsHealth.integrations.hubspot.metadata.rateLimit && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Rate Limit Remaining:</span>
                                <span className="font-medium">
                                  {integrationsHealth.integrations.hubspot.metadata.rateLimit}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                    />
                    <HealthStatusItem
                      title="Stripe"
                      description={
                        integrationsHealth?.integrations?.stripe?.status || 'Secret key configured'
                      }
                      ok={
                        systemHealth.stripe?.configured &&
                        integrationsHealth?.integrations?.stripe?.status !== 'unhealthy'
                      }
                      extra={
                        integrationsHealth?.integrations?.stripe?.metadata?.available && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Available Balance:</span>
                              <span className="font-medium">
                                $
                                {integrationsHealth.integrations.stripe.metadata.available[0]?.amount.toFixed(
                                  2
                                ) || '0.00'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Mode:</span>
                              <span className="font-medium">
                                {integrationsHealth.integrations.stripe.metadata.livemode
                                  ? 'Live'
                                  : 'Test'}
                              </span>
                            </div>
                          </div>
                        )
                      }
                    />
                    <HealthStatusItem
                      title="Google Maps"
                      description={
                        integrationsHealth?.integrations?.googleMaps?.status ||
                        'Client & server API keys'
                      }
                      ok={
                        systemHealth.googleMaps?.configured &&
                        integrationsHealth?.integrations?.googleMaps?.status !== 'unhealthy'
                      }
                    />
                    <HealthStatusItem
                      title="Notifications"
                      description="Available channels"
                      ok={!!systemHealth.notifications?.email}
                      extra={
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge
                            variant={systemHealth.notifications?.email ? 'success' : 'destructive'}
                          >
                            Email
                          </Badge>
                          <Badge variant={systemHealth.notifications?.sms ? 'success' : 'warning'}>
                            SMS
                          </Badge>
                          <Badge variant={systemHealth.notifications?.push ? 'success' : 'warning'}>
                            Push
                          </Badge>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Health data will appear here once the check completes.
                  </p>
                )}
                {healthError && <p className="mt-4 text-xs text-destructive">{healthError}</p>}
              </CardContent>
            </Card>

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
                        <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.customers?.name || 'N/A'}</TableCell>
                        <TableCell>{order.drivers?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${order.price_total?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : 'N/A'}
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
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage platform users and their roles</CardDescription>
                  </div>
                  <Button variant="accent" onClick={() => setIsCreateUserOpen(true)}>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="accent" className="capitalize">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.banned ? 'destructive' : 'success'}>
                            {user.banned ? 'Banned' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBanUser(user.auth_id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.auth_id)}
                            >
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

            {/* Create User Dialog */}
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the platform with a specific role.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recipient">Customer</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="dispatcher">Dispatcher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCreateUserOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleCreateUser} disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User Role</DialogTitle>
                  <DialogDescription>Change the role for {selectedUser?.email}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select
                      defaultValue={selectedUser?.role}
                      onValueChange={(value) => {
                        if (selectedUser) {
                          handleUpdateUserRole(selectedUser.auth_id || selectedUser.id, value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recipient">Customer</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                        <SelectItem value="dispatcher">Dispatcher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
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
                    const activeOrders =
                      driver.orders?.filter((o) => !['Delivered', 'Canceled'].includes(o.status)) ||
                      [];
                    return (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.phone}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {driver.vehicle_details || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={activeOrders.length > 0 ? 'accent' : 'secondary'}>
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
                      <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{order.customers?.name || 'N/A'}</TableCell>
                      <TableCell>{order.drivers?.name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="font-medium">
                        ${order.price_total?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
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
                    <h3 className="text-sm font-medium text-foreground mb-1">Configuration Note</h3>
                    <p className="text-sm text-muted-foreground">
                      Pricing is currently configured in{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        lib/config.ts
                      </code>
                      . Future versions will support database-driven pricing rules with real-time
                      updates.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Pricing Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="base-fee">Base Fee</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
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
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
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
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
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
                    <CardDescription>
                      View and filter all system events and activities
                    </CardDescription>
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
                      onChange={(e) =>
                        setLogFilter((prev) => ({ ...prev, eventType: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order-id-filter">Order ID</Label>
                    <Input
                      id="order-id-filter"
                      placeholder="Enter order ID"
                      value={logFilter.orderId}
                      onChange={(e) =>
                        setLogFilter((prev) => ({ ...prev, orderId: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-from-filter">Date From</Label>
                    <Input
                      id="date-from-filter"
                      type="date"
                      value={logFilter.dateFrom}
                      onChange={(e) =>
                        setLogFilter((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-to-filter">Date To</Label>
                    <Input
                      id="date-to-filter"
                      type="date"
                      value={logFilter.dateTo}
                      onChange={(e) =>
                        setLogFilter((prev) => ({ ...prev, dateTo: e.target.value }))
                      }
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
                    <p className="text-muted-foreground">
                      No logs found. Click "Refresh Logs" to load system events.
                    </p>
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
                              {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
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
