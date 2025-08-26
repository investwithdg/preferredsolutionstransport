'use client';

import { useState } from 'react';

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

      const result = await response.json();
      
      // Remove the assigned order from the list
      setOrders(orders.filter(order => order.id !== orderId));
      
      // Clear the selection
      setSelectedDriver(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });

      alert(`Driver assigned successfully! Order is now in "Assigned" status.`);
      
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
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            Orders ready for dispatch ({orders.length} pending)
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders pending</h3>
            <p className="mt-1 text-sm text-gray-500">
              Orders will appear here after successful payment.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assign Driver
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Order #{order.id.slice(-8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      {order.quotes?.distance_mi && (
                        <div className="text-sm text-gray-500">
                          {order.quotes.distance_mi} miles
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customers?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customers?.email}
                      </div>
                      {order.customers?.phone && (
                        <div className="text-sm text-gray-500">
                          {order.customers.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">From:</div>
                        <div className="text-gray-600 mb-2">
                          {order.quotes?.pickup_address || 'N/A'}
                        </div>
                        <div className="font-medium">To:</div>
                        <div className="text-gray-600">
                          {order.quotes?.dropoff_address || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${order.price_total.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 uppercase">
                        {order.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedDriver[order.id] || ''}
                          onChange={(e) => handleDriverSelect(order.id, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={isAssigning === order.id}
                        >
                          <option value="">Select Driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name} {driver.is_available ? '✓' : `(${driver.active_orders_count} active)`}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignDriver(order.id, selectedDriver[order.id])}
                          disabled={!selectedDriver[order.id] || isAssigning === order.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isAssigning === order.id ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Milestone 2 - Driver Assignment Active
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                You can now assign drivers to orders! Available drivers: {drivers.filter(d => d.is_available).length} | 
                Total drivers: {drivers.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
