/**
 * Supabase Client for Client-Side Components
 * Use this in 'use client' components for real-time subscriptions and client-side queries
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types';

export function createClient() {
  return createClientComponentClient<Database>();
}

