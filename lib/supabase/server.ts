import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isMasterAccountEnabled } from '@/lib/config';

/**
 * Supabase Client for Server Components (RSC)
 * Caches the client for the lifetime of the request
 * @deprecated Use createServerClientRSC instead
 */
export const createServerClient = async () => {
  return createServerClientRSC();
};

/**
 * For Server Components (read-only cookies)
 */
export async function createServerClientRSC() {
  const cookieStore = cookies();

  // If master account is enabled, use the service role client for all server-side operations
  if (isMasterAccountEnabled()) {
    return createServiceRoleClient();
  }

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createServiceClient<Database>(url, serviceKey, {
    auth: { 
      autoRefreshToken: false, 
      persistSession: false 
    },
  });
}
