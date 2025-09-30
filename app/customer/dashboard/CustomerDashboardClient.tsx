'use client';

import Link from 'next/link';

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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back, {customer.name}!
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Link
          href="/quote"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Request New Quote
        </Link>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Orders</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Past Orders */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {activeOrders.length > 0 ? 'Past Orders' : 'Order History'}
        </h2>
        {pastOrders.length > 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pastOrders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {order.quotes?.pickup_address.split(',')[0]} → {order.quotes?.dropoff_address.split(',')[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.price_total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/track/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No past orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-gray-500">
          #{order.id.slice(0, 8)}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <p className="text-xs text-gray-500">From</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {order.quotes?.pickup_address.split(',')[0]}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">To</p>
          <p className="text-sm font-medium text-gray-900 truncate">
            {order.quotes?.dropoff_address.split(',')[0]}
          </p>
        </div>
        {order.drivers && (
          <div>
            <p className="text-xs text-gray-500">Driver</p>
            <p className="text-sm font-medium text-gray-900">
              {order.drivers.name}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <span className="text-lg font-bold text-gray-900">
          ${order.price_total.toFixed(2)}
        </span>
        <Link
          href={`/track/${order.id}`}
          className="text-sm text-blue-600 hover:text-blue-900 font-medium"
        >
          Track Order →
        </Link>
      </div>
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
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
