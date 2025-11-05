import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from './types';
import { isMasterAccountEnabled } from '../config';
import { createServiceRoleClient } from './server';

/**
 * Create a Supabase client for Route Handlers with cookie mutation support
 */
export function createRouteHandlerClient(req: NextRequest, res: NextResponse) {
  if (isMasterAccountEnabled()) {
    return createServiceRoleClient();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });
}
