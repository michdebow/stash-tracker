import type { SupabaseClient } from "@/db/supabase.client";
import type { ExpenseCategoryDTO } from "@/types";

/**
 * Retrieves all expense categories.
 * Categories are system-wide and available to all users.
 * 
 * @param supabase - The Supabase client instance
 * @returns Array of expense categories
 * @throws Error if the database query fails
 */
export async function listExpenseCategories(
  supabase: SupabaseClient
): Promise<ExpenseCategoryDTO[]> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) {
    console.error("Error fetching expense categories:", error);
    throw new Error("Failed to fetch expense categories");
  }

  return data || [];
}
