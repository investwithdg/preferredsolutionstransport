import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Check for required environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('[Middleware] Missing Supabase environment variables', {
      hasUrl: !!url,
      hasAnon: !!anon,
      pathname,
    });

    // If accessing protected routes, redirect to an error page
    if (
      pathname.startsWith('/dispatcher') ||
      pathname.startsWith('/driver') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/customer')
    ) {
      const errorUrl = req.nextUrl.clone();
      errorUrl.pathname = '/offline';
      errorUrl.searchParams.set('error', 'config');
      return NextResponse.redirect(errorUrl);
    }

    return res;
  }

  // Protect dispatcher, driver, customer, and admin routes
  if (
    pathname.startsWith('/dispatcher') ||
    pathname.startsWith('/driver') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/customer')
  ) {
    // Skip if Supabase is not configured
    if (!url || !anon) {
      return res;
    }

    try {
      const supabase = createServerClient<Database>(url, anon, {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({ name, value, ...options });
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({ name, value: '', ...options });
            res.cookies.set({ name, value: '', ...options });
          },
        },
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/auth/sign-in';
        return NextResponse.redirect(redirectUrl);
      }

      // Fetch role from public.users (self record allowed by RLS)
      const { data: userRow } = await supabase
        .from('users' as any)
        .select('role')
        .eq('auth_id', session.user.id)
        .single();

      const role = (userRow as any)?.role as string | undefined;

      // If the user has no role yet, send them to role selection page to avoid redirect loops
      if (!role) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/auth/role-select';
        return NextResponse.redirect(redirectUrl);
      }

      if (pathname.startsWith('/dispatcher')) {
        if (role !== 'admin' && role !== 'dispatcher') {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = role === 'driver' ? '/driver' : '/customer/dashboard';
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (pathname.startsWith('/driver')) {
        if (role !== 'driver' && role !== 'admin' && role !== 'dispatcher') {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname =
            role === 'dispatcher' || role === 'admin' ? '/dispatcher' : '/customer/dashboard';
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (pathname.startsWith('/customer')) {
        if (role !== 'recipient' && role !== 'admin') {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = role === 'driver' ? '/driver' : '/dispatcher';
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (pathname.startsWith('/admin')) {
        if (role !== 'admin') {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname =
            role === 'driver'
              ? '/driver'
              : role === 'dispatcher'
                ? '/dispatcher'
                : '/customer/dashboard';
          return NextResponse.redirect(redirectUrl);
        }
      }
    } catch (error) {
      console.error('[Middleware] Auth check error:', error);
      // On error, redirect to sign-in
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/auth/sign-in';
      redirectUrl.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ['/dispatcher/:path*', '/driver/:path*', '/admin/:path*', '/customer/:path*'],
};
