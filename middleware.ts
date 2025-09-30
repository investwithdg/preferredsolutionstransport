import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Protect dispatcher, driver, and admin routes
  if (pathname.startsWith('/dispatcher') || pathname.startsWith('/driver') || pathname.startsWith('/admin')) {
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
        url.pathname = '/driver';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/driver')) {
      if (role !== 'driver' && role !== 'admin' && role !== 'dispatcher') {
        const url = req.nextUrl.clone();
        url.pathname = '/dispatcher';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/admin')) {
      if (role !== 'admin') {
        const url = req.nextUrl.clone();
        url.pathname = '/dispatcher';
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/dispatcher/:path*', '/driver/:path*', '/admin/:path*'],
};


