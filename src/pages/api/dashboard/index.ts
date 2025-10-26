import type { APIRoute } from "astro";
import { getDashboardData } from "@/lib/services/dashboard.service";

export const prerender = false;

/**
 * GET /api/dashboard
 * 
 * Retrieves dashboard data including stashes summary and current month's budget.
 * 
 * Query Parameters:
 * - yearMonth (optional): Year-month in YYYY-MM format (defaults to current month)
 * 
 * Response:
 * - 200: Dashboard data with stashes and budget summaries
 * - 401: User not authenticated
 * - 500: Server error
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const { user, supabase } = locals;

  // Check authentication
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "You must be logged in to access dashboard data" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get optional yearMonth query parameter
    const yearMonth = url.searchParams.get("yearMonth") || undefined;

    // Validate yearMonth format if provided
    if (yearMonth && !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid year-month format", 
          message: "yearMonth must be in YYYY-MM format" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch dashboard data
    const dashboardData = await getDashboardData(supabase, user.id, yearMonth);

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: "Failed to fetch dashboard data" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
