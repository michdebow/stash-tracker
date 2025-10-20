import type { APIRoute } from "astro";
import { z } from "zod";

import type { ErrorResponse, ValidationErrorResponse } from "@/types";

export const prerender = false;

// Validation schema for password reset request
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
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
    const validation = resetPasswordSchema.safeParse(body);

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

    const { password } = validation.data;

    // Update user password
    const { error: updateError } = await locals.supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      const status = "status" in updateError ? (updateError.status as number) : 500;

      let errorMessage: string;
      if (updateError.message?.toLowerCase().includes("expired") || updateError.message?.toLowerCase().includes("invalid")) {
        errorMessage = "This password reset link is invalid or has expired. Please request a new one.";
      } else if (status >= 500) {
        errorMessage = "We couldn't update your password right now. Please try again later.";
      } else {
        errorMessage = "We couldn't update your password. Please try again.";
      }

      const errorResponse: ErrorResponse = {
        error: "Password update failed",
        message: errorMessage,
        details: { code: updateError.code },
      };

      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sign out globally to revoke all sessions (US-003/AC-3)
    const { error: signOutError } = await locals.supabase.auth.signOut({ scope: "global" });

    if (signOutError) {
      console.error("Global sign-out error after password reset:", signOutError);
      // Don't fail the request - password was updated successfully
      // Log the error but continue
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Password updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Reset password endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "We couldn't update your password right now. Please try again later.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
