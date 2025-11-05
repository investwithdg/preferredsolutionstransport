import DriverClient from './DriverClient';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DriverDashboard } from '@/app/components/dashboards/driver/DriverDashboard';
import { isMasterAccountEnabled } from '@/lib/config';

// Force dynamic rendering because this page reads auth cookies via Supabase
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DriverPage() {
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
      return redirect('/auth/sign-in');
    }

    let driverId: string | undefined;

    if (isMasterAccountEnabled()) {
      // In master account mode, we need to fetch the driver record associated with the master user
      const { data: driverRecord } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      driverId = driverRecord?.id;
    } else {
      const { data: driverRecord } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      driverId = driverRecord?.id;
    }

    if (!driverId) {
      return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-900 mb-4">Driver Not Found</h1>
            <p className="text-red-700 mb-4">
              No driver record found for your account. Please contact support.
            </p>
            <div className="mt-4">
              <a href="/auth/sign-in" className="text-blue-600 hover:text-blue-800 underline">
                Try signing in again
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <DriverDashboard driverId={driverId} />
      </div>
    );
  } catch (error: any) {
    // Re-throw Next.js special errors (redirect/notFound) so the framework can handle them
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
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
