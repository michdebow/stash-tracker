import type { SupabaseClient } from "@/db/supabase.client";
import type {
  ListStashesQuery,
  StashListItemDTO,
  ApiPaginatedResponse,
  Stash,
  CreateStashCommand,
  StashDetailsDTO,
  DeleteStashCommand,
} from "@/types";

/**
 * Custom error class for duplicate stash names
 */
export class DuplicateStashError extends Error {
  constructor(message = "A stash with this name already exists") {
    super(message);
    this.name = "DuplicateStashError";
  }
}

/**
 * Custom error class for stash not found
 */
export class StashNotFoundError extends Error {
  constructor(message = "Stash not found") {
    super(message);
    this.name = "StashNotFoundError";
  }
}

/**
 * Custom error class for database constraint violations
 */
export class DatabaseConstraintError extends Error {
  constructor(message = "Database constraint violation prevents this operation") {
    super(message);
    this.name = "DatabaseConstraintError";
  }
}

/**
 * Creates a new stash for a user after checking for duplicates.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param data - The stash creation data containing the name
 * @returns The newly created stash entity
 * @throws DuplicateStashError if a stash with the same name already exists
 * @throws Error if the database operation fails
 */
export async function createStash(supabase: SupabaseClient, userId: string, data: CreateStashCommand): Promise<Stash> {
  // Check for duplicate stash name for this user
  const { data: existingStash, error: checkError } = await supabase
    .from("stashes")
    .select("id")
    .eq("user_id", userId)
    .eq("name", data.name)
    .is("deleted_at", null)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking for duplicate stash:", checkError);
    throw new Error("Failed to check for duplicate stash");
  }

  if (existingStash) {
    throw new DuplicateStashError();
  }

  // Insert the new stash
  const { data: newStash, error: insertError } = await supabase
    .from("stashes")
    .insert({
      user_id: userId,
      name: data.name,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating stash:", insertError);
    throw new Error("Failed to create stash");
  }

  if (!newStash) {
    throw new Error("Failed to retrieve created stash");
  }

  return newStash;
}

/**
 * Retrieves a paginated and sortable list of active stashes for a user.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param query - Query parameters for pagination and sorting
 * @returns Paginated response containing stashes and pagination metadata
 * @throws Error if the database query fails
 */
export async function listStashes(
  supabase: SupabaseClient,
  userId: string,
  query: ListStashesQuery
): Promise<ApiPaginatedResponse<StashListItemDTO>> {
  const { page, limit, sort, order } = query;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build the base query with filters
  let queryBuilder = supabase
    .from("stashes")
    .select("id, name, current_balance, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Apply sorting
  queryBuilder = queryBuilder.order(sort, { ascending: order === "asc" });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  // Execute the query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching stashes:", error);
    throw new Error("Failed to fetch stashes");
  }

  // Return formatted response
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
    },
  };
}

/**
 * Retrieves detailed information for a specific stash with optional transactions.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param stashId - The unique identifier of the stash to retrieve
 * @param includeTransactions - Whether to include the 50 most recent transactions
 * @returns Stash details with optional transactions
 * @throws StashNotFoundError if the stash is not found or doesn't belong to the user
 * @throws Error if the database query fails
 */
export async function getStashDetails(
  supabase: SupabaseClient,
  userId: string,
  stashId: string,
  includeTransactions = false
): Promise<StashDetailsDTO> {
  // Fetch the stash
  const { data: stash, error: stashError } = await supabase
    .from("stashes")
    .select("id, name, current_balance, created_at, updated_at")
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (stashError) {
    console.error("Error fetching stash:", stashError);
    throw new Error("Failed to fetch stash");
  }

  if (!stash) {
    throw new StashNotFoundError();
  }

  // Build the response DTO
  const stashDetails: StashDetailsDTO = {
    id: stash.id,
    name: stash.name,
    current_balance: stash.current_balance,
    created_at: stash.created_at,
    updated_at: stash.updated_at,
  };

  // Optionally fetch transactions
  if (includeTransactions) {
    const { data: transactions, error: transactionsError } = await supabase
      .from("stash_transactions")
      .select("id, stash_id, transaction_type, amount, description, created_at")
      .eq("stash_id", stashId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error("Error fetching stash transactions:", transactionsError);
      throw new Error("Failed to fetch stash transactions");
    }

    stashDetails.transactions = transactions || [];
  }

  return stashDetails;
}

/**
 * Updates the name of an existing stash after validating ownership and checking for duplicates.
 *
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param stashId - The unique identifier of the stash to update
 * @param newName - The new name for the stash
 * @returns The updated stash entity
 * @throws StashNotFoundError if the stash is not found or doesn't belong to the user
 * @throws DuplicateStashError if another active stash with the same name already exists
 * @throws Error if the database operation fails
 */
export async function updateStashName(
  supabase: SupabaseClient,
  userId: string,
  stashId: string,
  newName: string
): Promise<Stash> {
  // First, verify the stash exists and belongs to the user
  const { data: existingStash, error: fetchError } = await supabase
    .from("stashes")
    .select("id, name")
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching stash for update:", fetchError);
    throw new Error("Failed to fetch stash for update");
  }

  if (!existingStash) {
    throw new StashNotFoundError();
  }

  // Check if another active stash with the new name already exists
  const { data: duplicateStash, error: duplicateError } = await supabase
    .from("stashes")
    .select("id")
    .eq("user_id", userId)
    .eq("name", newName)
    .is("deleted_at", null)
    .neq("id", stashId) // Exclude the current stash
    .maybeSingle();

  if (duplicateError) {
    console.error("Error checking for duplicate stash name:", duplicateError);
    throw new Error("Failed to check for duplicate stash name");
  }

  if (duplicateStash) {
    throw new DuplicateStashError();
  }

  // Update the stash name
  const { data: updatedStash, error: updateError } = await supabase
    .from("stashes")
    .update({
      name: newName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating stash name:", updateError);
    throw new Error("Failed to update stash name");
  }

  if (!updatedStash) {
    throw new Error("Failed to retrieve updated stash");
  }

  return updatedStash;
}

/**
 * Soft-deletes a stash by setting its deleted_at timestamp.
 * Only the owner of the stash can delete it.
 *
 * @param supabase - The Supabase client instance
 * @param command - Command containing stashId and userId for authorization
 * @throws StashNotFoundError if the stash is not found or doesn't belong to the user
 * @throws DatabaseConstraintError if a database constraint prevents deletion
 * @throws Error if the database operation fails
 */
export async function deleteStash(supabase: SupabaseClient, command: DeleteStashCommand): Promise<void> {
  const { stashId, userId } = command;

  // Perform soft delete by updating deleted_at timestamp
  const { data, error } = await supabase
    .from("stashes")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error deleting stash:", error);

    // Check for constraint violation errors (e.g., foreign key constraints, triggers)
    // PostgreSQL error codes: 23000-23999 are integrity constraint violations
    if (error.code && error.code.startsWith("23")) {
      throw new DatabaseConstraintError("Cannot delete stash due to existing dependencies");
    }

    throw new Error("Failed to delete stash");
  }

  // If no rows were affected, the stash doesn't exist or doesn't belong to the user
  if (!data) {
    throw new StashNotFoundError();
  }
}
