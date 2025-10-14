import { createClient, type SupabaseClient as SupabaseClientBase } from '@supabase/supabase-js';

import type { Database } from './database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Fail fast to avoid misconfigured runtime
  throw new Error('Environment variables SUPABASE_URL and SUPABASE_KEY must be provided.');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
export type SupabaseClient = SupabaseClientBase<Database>;
