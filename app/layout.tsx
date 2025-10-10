import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Toaster } from '@/app/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Preferred Solutions Transport - Professional Delivery Services',
  description: 'Fast, reliable delivery service with real-time tracking and secure payment processing',
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
        <div className="min-h-screen bg-background">
          <nav className="bg-card shadow-soft-md border-b border-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link href="/" className="text-xl font-bold text-foreground hover:text-accent transition-colors">
                    Preferred Solutions Transport
                  </Link>
                </div>
                <div className="flex items-center space-x-2">
                  <Link 
                    href="/quote" 
                    className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Get a Quote
                  </Link>

                  {!session && (
                    <Link
                      href="/auth/sign-in"
                      className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  )}

                  {session && (
                    <>
                      {(role === 'admin') && (
                        <Link
                          href="/admin"
                          className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          Admin
                        </Link>
                      )}
                      {(role === 'admin' || role === 'dispatcher') && (
                        <Link
                          href="/dispatcher"
                          className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          Dispatcher
                        </Link>
                      )}
                      {(role === 'driver' || role === 'dispatcher' || role === 'admin') && (
                        <Link
                          href="/driver"
                          className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          Driver
                        </Link>
                      )}
                      {(role === 'recipient') && (
                        <Link
                          href="/customer/dashboard"
                          className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          My Orders
                        </Link>
                      )}
                      <form action="/auth/sign-out" method="post" className="inline">
                        <button
                          type="submit"
                          className="text-foreground hover:text-accent hover:bg-accent/10 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
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
          <Toaster position="top-right" />
        </div>
      </body>
    </html>
  );
}
