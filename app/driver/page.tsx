import DriverClient from './DriverClient';

export default function DriverPage() {
  // For now, we'll create a simple driver dashboard without authentication
  // In a production app, this would check the authenticated driver's session
  
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your assigned deliveries
          </p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Milestone 2 - Demo Mode
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    This is a demo driver dashboard. In production, drivers would authenticate and see only their assigned orders.
                    For testing, you can select any driver ID to simulate their view.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DriverClient />
        </div>
      </div>
    </div>
  );
}
