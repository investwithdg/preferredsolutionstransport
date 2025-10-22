import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * @deprecated Use createServerClientRSC instead
 */
export const createServerClient = async () => {
  return createServerClientRSC();
};

/**
 * For Server Components (read-only cookies)
 */
export async function createServerClientRSC() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Server Components cannot set cookies
      set() {},
      remove() {},
    },
  });
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
