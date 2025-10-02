import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Delivery Platform',
  description: 'Fast and reliable delivery service',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let role: string | null = null;
  if (session) {
    const { data: userRow } = await supabase
      .from('users' as any)
      .select('role')
      .eq('auth_id', session.user.id)
      .single();
    role = (userRow as any)?.role ?? null;
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold text-gray-900">
                    Delivery Platform
                  </Link>
                </div>
                <div className="flex items-center space-x-6">
                  <Link 
                    href="/quote" 
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Get a Quote
                  </Link>

                  {!session && (
                    <Link
                      href="/auth/sign-in"
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Sign in
                    </Link>
                  )}

                  {session && (
                    <>
                      {(role === 'admin') && (
                        <Link
                          href="/admin"
                          className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                          Admin
                        </Link>
                      )}
                      {(role === 'admin' || role === 'dispatcher') && (
                        <Link
                          href="/dispatcher"
                          className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                          Dispatcher
                        </Link>
                      )}
                      {(role === 'driver' || role === 'dispatcher' || role === 'admin') && (
                        <Link
                          href="/driver"
                          className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                          Driver
                        </Link>
                      )}
                      <form action="/auth/sign-out" method="post">
                        <button
                          type="submit"
                          className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                        >
                          Sign out
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
