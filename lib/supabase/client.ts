'use client';

/**
 * Supabase Client for Client-Side Components
 * Use this in 'use client' components for real-time subscriptions and client-side queries
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient<Database>(url, anon);
}

