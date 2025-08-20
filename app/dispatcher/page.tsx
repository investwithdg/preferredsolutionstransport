import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'] & {
  customers: Database['public']['Tables']['customers']['Row'] | null;
  quotes: Database['public']['Tables']['quotes']['Row'] | null;
};

export default async function DispatcherPage() {
  const supabase = createServerClient();

  // Fetch orders ready for dispatch
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      quotes (*)
    `)
    .eq('status', 'ReadyForDispatch')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            Orders ready for dispatch ({orders?.length || 0} pending)
          </p>
        </div>

        {!orders || orders.length === 0 ? (
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
                    Status
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
                        {new Date(order.created_at!).toLocaleString()}
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
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Milestone 1 - Read Only
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This dispatcher queue is read-only for M1. Driver authentication, assignment actions, 
                and status updates will be added in Milestone 2.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
