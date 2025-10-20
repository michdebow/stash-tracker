import { defineMiddleware } from 'astro:middleware';

import { createSupabaseServerInstance } from '../db/supabase.client.ts';

// Public auth pages that don't require authentication
const PUBLIC_AUTH_PATHS = ['/login', '/register', '/reset-password', '/update-password'];

// API endpoints that don't require authentication
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/session'];

// Protected app routes
const PROTECTED_PATH_PREFIX = '/app';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, request, redirect, locals } = context;

  // Create server-side Supabase client with SSR support
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Attach supabase client to locals for use in API routes
  locals.supabase = supabase;

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Attach user to locals if authenticated
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? null,
    };
  }

  const pathname = url.pathname;

  // If user is authenticated and trying to access public auth pages, redirect to dashboard
  if (user && PUBLIC_AUTH_PATHS.includes(pathname)) {
    return redirect('/app/dashboard');
  }

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!user && pathname.startsWith(PROTECTED_PATH_PREFIX)) {
    return redirect('/login');
  }

  // Allow public API paths without authentication
  if (PUBLIC_API_PATHS.includes(pathname)) {
    return next();
  }

  return next();
});
