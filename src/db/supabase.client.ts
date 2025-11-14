import type { AstroCookies } from "astro";
import { createClient, type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types.ts";

// Server-side environment variables (for SSR/middleware)
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

// Client-side environment variables (for browser/React components)
const publicSupabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const publicSupabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Validate server-side variables (required for middleware)
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Environment variables SUPABASE_URL and SUPABASE_KEY must be provided.");
}

// Client-side Supabase client (for React components)
// Use public vars if available, otherwise fall back to server vars (for SSR hydration)
const clientUrl = publicSupabaseUrl || supabaseUrl;
const clientKey = publicSupabaseKey || supabaseKey;

export const supabaseClient = createClient<Database>(clientUrl, clientKey);
export type SupabaseClient = SupabaseClientBase<Database>;

// Cookie options for server-side client
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse cookie header string into array of cookie objects
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create a server-side Supabase client with SSR support
 * Uses Astro cookies for session management
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
