import { createClientComponentClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const createClient = () => createClientComponentClient<Database>();
