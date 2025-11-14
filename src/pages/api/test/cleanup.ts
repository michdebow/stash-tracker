import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

// Only allow cleanup in development/test environments
const isTestEnvironment = process.env.NODE_ENV !== "production";

export const POST: APIRoute = async () => {
  // Security: Only allow in test/development environment
  if (!isTestEnvironment) {
    return new Response(JSON.stringify({ error: "Cleanup endpoint not available in production" }), { status: 403 });
  }

  try {
    // Use service role key to bypass RLS policies
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🧹 Cleaning up all test data...`);

    // Delete all stash transactions
    const { error: transError } = await supabase.from("stash_transactions").delete().gte("created_at", "1900-01-01");

    if (transError) {
      console.error("Error deleting stash transactions:", transError);
    } else {
      console.log("✅ Deleted stash transactions");
    }

    // Delete all stashes
    console.log("🗑️  Attempting to delete stashes...");
    const { error: deleteStashError } = await supabase.from("stashes").delete().gte("created_at", "1900-01-01");

    if (deleteStashError) {
      console.error("❌ Error deleting stashes:", deleteStashError);
    } else {
      console.log("✅ Stashes deleted successfully");
    }

    // Delete all expenses
    const { error: deleteExpenseError } = await supabase.from("expenses").delete().gte("created_at", "1900-01-01");

    if (deleteExpenseError) {
      console.error("Error deleting expenses:", deleteExpenseError);
    } else {
      console.log("✅ Deleted expenses");
    }

    // Delete all month budgets
    const { error: deleteBudgetError } = await supabase.from("month_budget").delete().gte("created_at", "1900-01-01");

    if (deleteBudgetError) {
      console.error("Error deleting budgets:", deleteBudgetError);
    } else {
      console.log("✅ Deleted budgets");
    }

    console.log(`✅ Cleanup completed`);

    return new Response(
      JSON.stringify({
        message: "Cleanup completed successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
