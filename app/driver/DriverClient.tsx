'use client';

import { useState, useEffect } from 'react';

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
      // For demo purposes, we'll fetch all orders and filter by driver_id
      // In production, this would be handled by RLS policies
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
        alert(`Order status updated to ${newStatus}`);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned': return 'bg-yellow-100 text-yellow-800';
      case 'Accepted': return 'bg-blue-100 text-blue-800';
      case 'PickedUp': return 'bg-purple-100 text-purple-800';
      case 'InTransit': return 'bg-orange-100 text-orange-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-6">
      {/* Driver Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label htmlFor="driver-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Driver (Demo Mode)
        </label>
        <select
          id="driver-select"
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Choose a driver...</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} ({driver.active_orders_count} active orders)
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      {selectedDriverId && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Assigned Orders {isLoading && '(Loading...)'}
          </h2>

          {orders.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                This driver has no orders assigned to them.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const nextStatus = getNextStatus(order.status);
                return (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            Order #{order.id.slice(-8)}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Customer</h4>
                            <p className="text-sm text-gray-600">{order.customers?.name}</p>
                            <p className="text-sm text-gray-600">{order.customers?.email}</p>
                            {order.customers?.phone && (
                              <p className="text-sm text-gray-600">{order.customers.phone}</p>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Details</h4>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">From:</span> {order.quotes?.pickup_address}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">To:</span> {order.quotes?.dropoff_address}
                            </p>
                            {order.quotes?.distance_mi && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Distance:</span> {order.quotes.distance_mi} miles
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Total:</span> ${order.price_total.toFixed(2)} {order.currency.toUpperCase()}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500">
                          Created: {new Date(order.created_at).toLocaleString()} | 
                          Updated: {new Date(order.updated_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="ml-4">
                        {nextStatus && order.status !== 'Delivered' && order.status !== 'Canceled' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, nextStatus)}
                            disabled={isUpdating === order.id}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdating === order.id ? 'Updating...' : `Mark as ${nextStatus}`}
                          </button>
                        )}
                        
                        {(order.status === 'Delivered' || order.status === 'Canceled') && (
                          <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500">
                            Order Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
