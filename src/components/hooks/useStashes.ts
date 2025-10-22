import { useState, useEffect, useCallback } from "react";
import type { StashListItemDTO, ApiPaginatedResponse } from "@/types";

interface UseStashesReturn {
  stashes: StashListItemDTO[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useStashes(): UseStashesReturn {
  const [stashes, setStashes] = useState<StashListItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStashes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/stashes");

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to fetch stashes: ${response.statusText}`);
      }

      const data: ApiPaginatedResponse<StashListItemDTO> = await response.json();
      setStashes(data.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStashes();
  }, [fetchStashes]);

  return { stashes, isLoading, error, refresh: fetchStashes };
}
