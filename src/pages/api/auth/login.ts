import type { APIRoute } from 'astro';
import { z } from 'zod';

import type { ErrorResponse, ValidationErrorResponse } from '@/types';

export const prerender = false;

// Validation schema for login request
const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: 'Validation failed',
        message: 'Invalid input data',
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, password } = validation.data;

    // Sign in with Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Determine error type and status code
      const status = 'status' in error ? (error.status as number) : 500;

      let errorMessage: string;
      if (status >= 500) {
        errorMessage = "We couldn't sign you in right now. Please try again later.";
      } else {
        errorMessage = 'Unable to sign in. Check your email and password.';
      }

      const errorResponse: ErrorResponse = {
        error: 'Authentication failed',
        message: errorMessage,
        details: { code: error.code },
      };

      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return success response with user data
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Login endpoint error:', err);

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: "We couldn't sign you in right now. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
