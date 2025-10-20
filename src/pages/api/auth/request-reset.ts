import type { APIRoute } from "astro";
import { z } from "zod";

import type { ErrorResponse, ValidationErrorResponse } from "@/types";

export const prerender = false;

// Validation schema for password reset request
const requestResetSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

export const POST: APIRoute = async ({ request, locals, url }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = requestResetSchema.safeParse(body);

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

    const { email } = validation.data;

    // Build redirect URL for password reset
    const redirectTo = `${url.origin}/update-password`;

    // Request password reset email from Supabase
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset request error:", error);
      // Don't reveal if email exists - always return success
      // This prevents account enumeration
    }

    // Always return success to prevent account enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Request reset endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
