import type { APIRoute } from "astro";
import { z } from "zod";

import type { ErrorResponse, ValidationErrorResponse } from "@/types";

export const prerender = false;

// Validation schema for recovery code verification
const verifyRecoverySchema = z.object({
  code: z.string().min(1, "Recovery code is required"),
});

/**
 * Verify and exchange a recovery code for a session
 * Used by the password reset form to validate the reset link
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = verifyRecoverySchema.safeParse(body);

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

    const { code } = validation.data;

    // Verify the OTP/recovery code with Supabase
    // The code from the email is a token_hash that needs to be verified
    const { data, error } = await locals.supabase.auth.verifyOtp({
      token_hash: code,
      type: "recovery",
    });

    // If verifyOtp fails, try exchanging the code for a session directly
    if (error && error.message?.includes("invalid")) {
      console.log("Trying alternative verification method...");

      // Try using the code as part of the URL to establish session
      const { data: sessionData, error: sessionError } = await locals.supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error("Error exchanging code for session:", sessionError);

        const errorResponse: ErrorResponse = {
          error: "Verification failed",
          message: "This password reset link is invalid or has expired. Please request a new one.",
          details: { code: sessionError.code },
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!sessionData.session) {
        const errorResponse: ErrorResponse = {
          error: "No session created",
          message: "Unable to verify reset link. Please request a new one.",
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Valid recovery code - session created via code exchange
      return new Response(
        JSON.stringify({
          valid: true,
          message: "Recovery code verified successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error) {
      console.error("Error verifying recovery code:", error);

      const errorResponse: ErrorResponse = {
        error: "Verification failed",
        message: "This password reset link is invalid or has expired. Please request a new one.",
        details: { code: error.code },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data.session) {
      const errorResponse: ErrorResponse = {
        error: "No session created",
        message: "Unable to verify reset link. Please request a new one.",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Valid recovery code - session created
    return new Response(
      JSON.stringify({
        valid: true,
        message: "Recovery code verified successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Verify recovery endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to verify reset link. Please try again.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
