import DriverClient from './DriverClient';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Force dynamic rendering because this page reads auth cookies via Supabase
export const dynamic = 'force-dynamic';

export default async function DriverPage() {
  const supabase = await createServerClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return redirect('/auth/sign-in');
    }

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your assigned deliveries</p>
          </div>

          <div className="p-6">
            <DriverClient />
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Error loading driver page:', error);
    redirect('/auth/sign-in');
  }
}
