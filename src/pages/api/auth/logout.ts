import type { APIRoute } from "astro";

import type { ErrorResponse } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  try {
    // Sign out with global scope to revoke all sessions
    const { error } = await locals.supabase.auth.signOut({ scope: "global" });

    if (error) {
      console.error("Logout error:", error);

      const errorResponse: ErrorResponse = {
        error: "Logout failed",
        message: "Unable to sign out. Please try again.",
        details: { code: error.code },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Redirect to index page after successful logout
    return redirect("/", 303);
  } catch (err) {
    console.error("Logout endpoint error:", err);

    const errorResponse: ErrorResponse = {
      error: "Internal server error",
      message: "Unable to sign out. Please try again.",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
