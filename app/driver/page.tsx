import DriverClient from './DriverClient';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DriverPage() {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your assigned deliveries</p>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Milestone 2 - Demo Mode</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This is a demo driver dashboard. In production, drivers would authenticate and
                      see only their assigned orders. For testing, you can select any driver ID to
                      simulate their view.
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

  // Add error handling for environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Configuration Error</h1>
          <p className="text-red-700 mb-4">
            Supabase environment variables are not configured. Please check your Vercel environment
            variables.
          </p>
          <div className="bg-white rounded p-4 text-sm font-mono text-gray-600">
            <p>Missing variables:</p>
            <ul className="list-disc ml-6 mt-2">
              {!process.env.NEXT_PUBLIC_SUPABASE_URL && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
              {!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      redirect('/auth/sign-in');
    }

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your assigned deliveries</p>
          </div>

          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Milestone 2 - Demo Mode</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      This is a demo driver dashboard. In production, drivers would authenticate and
                      see only their assigned orders. For testing, you can select any driver ID to
                      simulate their view.
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
  } catch (error) {
    console.error('Driver page error:', error);
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Server Error</h1>
          <p className="text-red-700 mb-4">An error occurred while loading the driver dashboard.</p>
          <details className="bg-white rounded p-4 text-sm">
            <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
            <pre className="text-xs overflow-auto">
              {error instanceof Error ? error.message : 'Unknown error'}
            </pre>
          </details>
          <div className="mt-4">
            <a href="/auth/sign-in" className="text-blue-600 hover:text-blue-800 underline">
              Try signing in again
            </a>
          </div>
        </div>
      </div>
    );
  }
}
