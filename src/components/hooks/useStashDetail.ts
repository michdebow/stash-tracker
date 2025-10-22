import { useState, useEffect, useCallback } from "react";
import type { StashDetailsDTO } from "@/types";

interface UseStashDetailReturn {
  stash: StashDetailsDTO | null;
  isLoading: boolean;
  error: Error | null;
  refreshData: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage stash details
 * @param stashId - The unique identifier of the stash
 * @param initialData - Optional initial data to prevent loading state on first render
 */
export function useStashDetail(
  stashId: string,
  initialData?: StashDetailsDTO
): UseStashDetailReturn {
  const [stash, setStash] = useState<StashDetailsDTO | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  const fetchStash = useCallback(async () => {
    if (!stashId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/stashes/${stashId}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 404) {
          throw new Error("Stash not found");
        }
        throw new Error(`Failed to fetch stash: ${response.statusText}`);
      }

      const responseData = await response.json();
      // API returns { data: StashDetailsDTO }
      setStash(responseData.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  }, [stashId]);

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (!initialData) {
      fetchStash();
    }
  }, [fetchStash, initialData]);

  return {
    stash,
    isLoading,
    error,
    refreshData: fetchStash,
  };
}
