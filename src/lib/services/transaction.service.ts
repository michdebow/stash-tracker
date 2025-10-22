import type { SupabaseClient } from "@/db/supabase.client";
import type { ListTransactionsQuery, StashTransactionDTO, ApiPaginatedResponse, CreateStashTransactionCommand } from "@/types";

/**
 * Custom error class for stash not found
 */
export class StashNotFoundError extends Error {
  constructor(message: string = "Stash not found") {
    super(message);
    this.name = "StashNotFoundError";
  }
}

/**
 * Custom error class for insufficient balance
 */
export class InsufficientBalanceError extends Error {
  constructor(message: string = "Insufficient balance for withdrawal") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

/**
 * Custom error class for transaction not found
 */
export class TransactionNotFoundError extends Error {
  constructor(message: string = "Transaction not found") {
    super(message);
    this.name = "TransactionNotFoundError";
  }
}

/**
 * Retrieves a paginated and filterable list of transactions for a specific stash.
 * 
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param stashId - The unique identifier of the stash
 * @param query - Query parameters for pagination, filtering, and sorting
 * @returns Paginated response containing transactions and pagination metadata
 * @throws StashNotFoundError if the stash is not found or doesn't belong to the user
 * @throws Error if the database query fails
 */
export async function listStashTransactions(
  supabase: SupabaseClient,
  userId: string,
  stashId: string,
  query: ListTransactionsQuery
): Promise<ApiPaginatedResponse<StashTransactionDTO>> {
  // First, verify the stash exists and belongs to the user
  const { data: stash, error: stashError } = await supabase
    .from("stashes")
    .select("id")
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (stashError) {
    console.error("Error verifying stash ownership:", stashError);
    throw new Error("Failed to verify stash ownership");
  }

  if (!stash) {
    throw new StashNotFoundError();
  }

  const { page, limit, type, from, to, order } = query;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Build the base query with filters
  let queryBuilder = supabase
    .from("stash_transactions")
    .select("id, stash_id, transaction_type, amount, description, created_at", { count: "exact" })
    .eq("stash_id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Apply optional filters
  if (type) {
    queryBuilder = queryBuilder.eq("transaction_type", type);
  }

  if (from) {
    queryBuilder = queryBuilder.gte("created_at", from);
  }

  if (to) {
    queryBuilder = queryBuilder.lte("created_at", to);
  }

  // Apply sorting
  queryBuilder = queryBuilder.order("created_at", { ascending: order === "asc" });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  // Execute the query
  const { data, error, count } = await queryBuilder;

  if (error) {
    console.error("Error fetching stash transactions:", error);
    throw new Error("Failed to fetch stash transactions");
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
 * Creates a new transaction for a specific stash.
 * Database triggers will automatically update the stash's current_balance.
 * 
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param stashId - The unique identifier of the stash
 * @param command - The transaction data (transaction_type, amount, description)
 * @returns The newly created transaction
 * @throws StashNotFoundError if the stash is not found or doesn't belong to the user
 * @throws InsufficientBalanceError if a withdrawal would result in negative balance
 * @throws Error if the database query fails
 */
export async function createTransaction(
  supabase: SupabaseClient,
  userId: string,
  stashId: string,
  command: CreateStashTransactionCommand
): Promise<StashTransactionDTO> {
  // First, verify the stash exists and belongs to the user
  const { data: stash, error: stashError } = await supabase
    .from("stashes")
    .select("id")
    .eq("id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (stashError) {
    console.error("Error verifying stash ownership:", stashError);
    throw new Error("Failed to verify stash ownership");
  }

  if (!stash) {
    throw new StashNotFoundError();
  }

  // Insert the transaction
  const { data, error } = await supabase
    .from("stash_transactions")
    .insert({
      stash_id: stashId,
      user_id: userId,
      transaction_type: command.transaction_type,
      amount: command.amount,
      description: command.description || null,
    })
    .select("id, stash_id, transaction_type, amount, description, created_at")
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    
    // Check for specific database errors
    // P0001: raise_exception from trigger (insufficient balance)
    if (error.code === "P0001" && error.message?.includes("Insufficient balance")) {
      throw new InsufficientBalanceError();
    }
    
    // 23514: Check constraint violation (e.g., amount must be positive)
    if (error.code === "23514") {
      throw new Error("Transaction validation failed: " + error.message);
    }
    
    // 23503: Foreign key violation (stash doesn't exist)
    if (error.code === "23503") {
      throw new StashNotFoundError();
    }
    
    throw new Error("Failed to create transaction");
  }

  if (!data) {
    throw new Error("Transaction created but no data returned");
  }

  return data;
}

/**
 * Soft-deletes a transaction by setting its deleted_at timestamp.
 * This reverses the transaction's impact on the stash balance via database triggers.
 * 
 * @param supabase - The Supabase client instance
 * @param userId - The authenticated user's ID
 * @param stashId - The unique identifier of the stash
 * @param transactionId - The unique identifier of the transaction to delete
 * @throws TransactionNotFoundError if the transaction is not found or doesn't belong to the user
 * @throws Error if the database query fails
 */
export async function softDeleteTransaction(
  supabase: SupabaseClient,
  userId: string,
  stashId: string,
  transactionId: string
): Promise<void> {
  // Soft-delete the transaction by setting deleted_at to current timestamp
  // Include user_id and stash_id in WHERE clause for authorization
  const { error, count } = await supabase
    .from("stash_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("stash_id", stashId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Error soft-deleting transaction:", error);
    throw new Error("Failed to delete transaction");
  }

  // If no rows were affected, the transaction doesn't exist or was already deleted
  if (count === 0) {
    throw new TransactionNotFoundError();
  }
}
