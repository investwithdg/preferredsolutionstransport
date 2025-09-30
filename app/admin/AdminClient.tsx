'use client';

import { useState } from 'react';

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

export default function AdminClient({ initialUsers, initialDrivers, initialOrders, stats }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'drivers' | 'orders' | 'pricing'>('overview');

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage users, drivers, orders, and system configuration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'users', name: 'Users' },
            { id: 'drivers', name: 'Drivers' },
            { id: 'orders', name: 'Orders' },
            { id: 'pricing', name: 'Pricing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">System Overview</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <StatCard title="Total Orders" value={stats.totalOrders} />
              <StatCard 
                title="Total Revenue" 
                value={`$${stats.totalRevenue.toFixed(2)}`} 
              />
              <StatCard title="Active Orders" value={stats.activeOrders} />
              <StatCard title="Total Drivers" value={stats.totalDrivers} />
              <StatCard title="Total Users" value={stats.totalUsers} />
            </div>

            {/* Recent Orders */}
            <div>
              <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {initialOrders.slice(0, 10).map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customers?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.drivers?.name || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${order.price_total?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">User Management</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Add User
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Driver Management</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Add Driver
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialDrivers.map((driver) => {
                    const activeOrders = driver.orders?.filter(o => !['Delivered', 'Canceled'].includes(o.status)) || [];
                    return (
                      <tr key={driver.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {driver.vehicle_details || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activeOrders.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button className="text-blue-600 hover:text-blue-900 mr-4">Edit</button>
                          <button className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Order Management</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customers?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.drivers?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.price_total?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Pricing Configuration</h2>
            
            <div className="max-w-2xl">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Configuration Note
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Pricing is currently configured in <code className="bg-yellow-100 px-1 rounded">lib/config.ts</code>.
                        Future versions will support database-driven pricing rules.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Fee</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      disabled
                      defaultValue="50.00"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Per Mile Rate</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      disabled
                      defaultValue="2.00"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuel Surcharge</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      disabled
                      defaultValue="10"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md bg-gray-50"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed"
                  >
                    Save Changes (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ReadyForDispatch: 'bg-yellow-100 text-yellow-800',
    Assigned: 'bg-blue-100 text-blue-800',
    PickedUp: 'bg-purple-100 text-purple-800',
    Delivered: 'bg-green-100 text-green-800',
    Canceled: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
