import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to get the Supabase client with proper typing
export function getSupabaseClient() {
  return supabase;
}
