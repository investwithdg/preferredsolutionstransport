import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  
  // Check if demo mode is enabled via cookie
  const isDemoMode = req.cookies.get('demo-mode')?.value === 'true';

  // Protect dispatcher, driver, customer, and admin routes
  if (pathname.startsWith('/dispatcher') || pathname.startsWith('/driver') || pathname.startsWith('/admin') || pathname.startsWith('/customer')) {
    
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
        url.pathname = role === 'dispatcher' || role === 'admin' ? '/dispatcher' : '/customer/dashboard';
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
        url.pathname = role === 'driver' ? '/driver' : role === 'dispatcher' ? '/dispatcher' : '/customer/dashboard';
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/dispatcher/:path*', '/driver/:path*', '/admin/:path*', '/customer/:path*'],
};


