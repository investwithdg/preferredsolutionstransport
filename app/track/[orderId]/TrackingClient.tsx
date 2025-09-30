'use client';

type Order = {
  id: string;
  status: string;
  price_total: number;
  created_at: string;
  updated_at: string;
  customers: {
    name: string;
    email: string;
    phone: string;
  } | null;
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

type Event = {
  id: string;
  event_type: string;
  created_at: string;
  actor: string;
  payload?: any;
};

type Props = {
  order: Order;
  events: Event[];
};

export default function TrackingClient({ order, events }: Props) {
  const statuses = ['ReadyForDispatch', 'Assigned', 'PickedUp', 'Delivered'];
  const currentStatusIndex = statuses.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
              <p className="text-sm text-gray-500 mt-1 font-mono">Order #{order.id.slice(0, 8)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Delivery Progress</h2>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${((currentStatusIndex + 1) / statuses.length) * 100}%`,
                }}
              />
            </div>

            {/* Status Steps */}
            <div className="relative flex justify-between">
              {[
                { key: 'ReadyForDispatch', label: 'Ready for Dispatch', icon: '📦' },
                { key: 'Assigned', label: 'Driver Assigned', icon: '🚚' },
                { key: 'PickedUp', label: 'Picked Up', icon: '📍' },
                { key: 'Delivered', label: 'Delivered', icon: '✓' },
              ].map((step, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 ${
                        isCompleted
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}
                    >
                      {step.icon}
                    </div>
                    <p className={`text-xs text-center max-w-[80px] ${
                      isCompleted ? 'text-gray-900 font-medium' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Delivery Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Pickup Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.quotes?.pickup_address || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dropoff Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.quotes?.dropoff_address || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Distance</p>
                <p className="text-sm font-medium text-gray-900">
                  {order.quotes?.distance_mi || 'N/A'} miles
                </p>
              </div>
            </div>
          </div>

          {/* Driver & Contact */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Driver Information</h2>
            {order.drivers ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Driver Name</p>
                  <p className="text-sm font-medium text-gray-900">{order.drivers.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Driver Phone</p>
                  <p className="text-sm font-medium text-gray-900">
                    <a href={`tel:${order.drivers.phone}`} className="text-blue-600 hover:underline">
                      {order.drivers.phone}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No driver assigned yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  A driver will be assigned to your order shortly
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Total</span>
              <span className="font-semibold">${order.price_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Date</span>
              <span className="text-gray-900">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
          <div className="space-y-4">
            {events.length > 0 ? (
              events.map((event, index) => (
                <div key={event.id} className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-blue-600 rounded-full" />
                    {index < events.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEventType(event.event_type)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No activity recorded yet</p>
            )}
          </div>
        </div>

        {/* Customer Support */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-700">
            If you have any questions about your order, please contact us at{' '}
            <a href="mailto:support@preferredsolutions.com" className="underline">
              support@preferredsolutions.com
            </a>
          </p>
        </div>
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
    <span className={`px-3 py-1 text-sm rounded-full font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function formatEventType(eventType: string): string {
  const formats: Record<string, string> = {
    payment_completed: 'Payment Received',
    driver_assigned: 'Driver Assigned',
    status_updated: 'Status Updated',
    picked_up: 'Package Picked Up',
    delivered: 'Package Delivered',
  };

  return formats[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
