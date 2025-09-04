import { createServerClient } from '@/lib/supabase/server';
import { createRepositories, type OrderWithRelations } from '@/lib/database/repositories';
import { Card, CardHeader, CardTitle, CardDescription, EmptyState, EmptyStateIcons, Alert } from '@/components/ui';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';

export default async function DispatcherPage() {
  const supabase = createServerClient();
  const repos = createRepositories(supabase);

  let orders: OrderWithRelations[] = [];
  let error: Error | null = null;

  try {
    orders = await repos.orders.getReadyForDispatch();
  } catch (e) {
    error = e as Error;
    console.error('Error fetching orders:', error);
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="none">
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
          <CardDescription>
            Orders ready for dispatch ({orders.length} pending)
          </CardDescription>
        </CardHeader>

        {error ? (
          <div className="p-6">
            <Alert type="error" title="Failed to load orders">
              There was an error loading the dispatch queue. Please try refreshing the page.
            </Alert>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={EmptyStateIcons.inbox}
            title="No orders pending"
            description="Orders will appear here after successful payment."
          />
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
                        {formatDate(order.created_at!)}
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
                        {formatCurrency(order.price_total)}
                      </div>
                      <div className="text-sm text-gray-500 uppercase">
                        {order.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {formatStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Alert type="warning" title="Milestone 1 - Read Only">
          This dispatcher queue is read-only for M1. Driver authentication, assignment actions, 
          and status updates will be added in Milestone 2.
        </Alert>
      </div>
    </div>
  );
}
