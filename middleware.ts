import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isDemoEnabled } from '@/lib/config';
import { getBaseUrl } from '@/lib/auth-helpers';
import type { Database } from '@/lib/supabase/types';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Debug: log environment context once per request
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Auth Middleware] path:', pathname, ' envBaseUrl:', getBaseUrl());
  }

  // Check if demo mode is enabled via env and cookie
  const isDemoMode = isDemoEnabled() && req.cookies.get('demo-mode')?.value === 'true';

  // Protect dispatcher, driver, customer, and admin routes
  if (
    pathname.startsWith('/dispatcher') ||
    pathname.startsWith('/driver') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/customer')
  ) {
    // Skip auth check in demo mode
    if (isDemoMode) {
      return res;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/sign-in';
      return NextResponse.redirect(url);
    }

    // Fetch role from public.users (self record allowed by RLS)
    const { data: userRow } = await supabase
      .from('users' as any)
      .select('role')
      .eq('auth_id', session.user.id)
      .single();

    const role = (userRow as any)?.role as string | undefined;

    if (pathname.startsWith('/dispatcher')) {
      if (role !== 'admin' && role !== 'dispatcher') {
        const url = req.nextUrl.clone();
        url.pathname = role === 'driver' ? '/driver' : '/customer/dashboard';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/driver')) {
      if (role !== 'driver' && role !== 'admin' && role !== 'dispatcher') {
        const url = req.nextUrl.clone();
        url.pathname =
          role === 'dispatcher' || role === 'admin' ? '/dispatcher' : '/customer/dashboard';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/customer')) {
      if (role !== 'recipient' && role !== 'admin') {
        const url = req.nextUrl.clone();
        url.pathname = role === 'driver' ? '/driver' : '/dispatcher';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/admin')) {
      if (role !== 'admin') {
        const url = req.nextUrl.clone();
        url.pathname =
          role === 'driver'
            ? '/driver'
            : role === 'dispatcher'
              ? '/dispatcher'
              : '/customer/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/dispatcher/:path*', '/driver/:path*', '/admin/:path*', '/customer/:path*'],
};
