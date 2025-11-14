import { useState, useEffect, useCallback } from "react";
import type { StashTransactionDTO, ApiPaginatedResponse } from "@/types";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface UseStashTransactionsReturn {
  transactions: StashTransactionDTO[];
  pagination: PaginationState;
  isLoading: boolean;
  error: Error | null;
  setPage: (page: number) => void;
  refreshData: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage paginated stash transactions
 * @param stashId - The unique identifier of the stash
 * @param initialPage - The initial page number (default: 1)
 * @param initialLimit - The number of items per page (default: 20)
 */
export function useStashTransactions(stashId: string, initialPage = 1, initialLimit = 20): UseStashTransactionsReturn {
  const [transactions, setTransactions] = useState<StashTransactionDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!stashId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        order: "desc",
      });

      const response = await fetch(`/api/stashes/${stashId}/transactions?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 404) {
          throw new Error("Stash not found");
        }
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data: ApiPaginatedResponse<StashTransactionDTO> = await response.json();
      setTransactions(data.data);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  }, [stashId, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  return {
    transactions,
    pagination,
    isLoading,
    error,
    setPage,
    refreshData: fetchTransactions,
  };
}
