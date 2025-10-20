import type { APIRoute } from "astro";
import { z } from "zod";

import type { ErrorResponse, ValidationErrorResponse } from "@/types";

export const prerender = false;

// Validation schema for registration request
const registerSchema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .regex(/[^A-Za-z0-9]/, "Include at least one special character"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password.trim() !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password cannot include leading or trailing spaces",
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords must match",
      });
    }
  });

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      const errorResponse: ValidationErrorResponse = {
        error: "Validation failed",
        message: "Invalid input data",
        errors,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, password } = validation.data;

    // Sign up with Supabase
    const { data: signUpData, error: signUpError } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      // Determine error type and status code
      const status = "status" in signUpError ? (signUpError.status as number) : 500;

      let errorMessage: string;
      if (status >= 500) {
        errorMessage = "We couldn't create your account right now. Please try again later.";
      } else if ("code" in signUpError && signUpError.code === "user_already_exists") {
        errorMessage = "It looks like you already have an account. Try signing in instead.";
      } else {
        errorMessage = "We couldn't create your account. Please verify your details and try again.";
      }

      const errorResponse: ErrorResponse = {
        error: "Registration failed",
        message: errorMessage,
        details: { code: signUpError.code },
      };

      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If no session was created (email verification enabled), attempt auto-login
    if (!signUpData.session) {
      const { data: signInData, error: signInError } = await locals.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const status = "status" in signInError ? (signInError.status as number) : 500;

        let errorMessage: string;
        if (status >= 500) {
          errorMessage = "Your account was created, but we couldn't sign you in. Please try again.";
        } else {
          errorMessage = "We created your account, but couldn't sign you in automatically. Please try logging in.";
        }

        const errorResponse: ErrorResponse = {
          error: "Auto-login failed",
          message: errorMessage,
          details: { code: signInError.code },
        };

        return new Response(JSON.stringify(errorResponse), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return success response with user data from sign-in
      return new Response(
        JSON.stringify({
          user: {
            id: signInData.user.id,
            email: signInData.user.email,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response with user data from sign-up
    return new Response(
      JSON.stringify({
        user: {
          id: signUpData.user.id,
          email: signUpData.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Registration endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "We couldn't create your account right now. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
