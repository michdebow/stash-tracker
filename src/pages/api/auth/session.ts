import type { APIRoute } from 'astro';

import type { ErrorResponse } from '@/types';

export const prerender = false;

/**
 * DTO for auth session response
 */
interface AuthSessionDTO {
  user: {
    id: string;
    email: string | null;
  } | null;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get current user from locals (set by middleware)
    const user = locals.user;

    const response: AuthSessionDTO = {
      user: user ?? null,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Session endpoint error:', err);

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: 'Unable to retrieve session.',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
