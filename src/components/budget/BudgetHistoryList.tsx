import { useState, useEffect, useCallback } from "react";
import type { MonthBudgetListItemDTO, ApiPaginatedResponse, ErrorResponse } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { BudgetHistoryItem } from "./BudgetHistoryItem";

interface BudgetHistoryListProps {
  refreshTrigger?: number;
}

/**
 * BudgetHistoryList component
 * Displays paginated list of past monthly budgets in reverse chronological order
 */
export function BudgetHistoryList({ refreshTrigger = 0 }: BudgetHistoryListProps) {
  // State management
  const [budgets, setBudgets] = useState<MonthBudgetListItemDTO[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [limit] = useState<number>(12);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / limit);

  // Fetch budget list
  const fetchBudgets = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          order: "desc",
        });

        const response = await fetch(`/api/month-budgets?${params.toString()}`);

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json()) as ErrorResponse;
          setError(errorData.message || "Failed to fetch budget history");
          return;
        }

        const data = (await response.json()) as ApiPaginatedResponse<MonthBudgetListItemDTO>;
        setBudgets(data.data);
        setTotalItems(data.pagination.total);
        setCurrentPage(data.pagination.page);
      } catch (err) {
        console.error("Error fetching budgets:", err);
        setError("Unable to connect. Please check your internet connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  // Fetch on mount and when page changes
  useEffect(() => {
    fetchBudgets(currentPage);
  }, [currentPage, fetchBudgets]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchBudgets(currentPage);
    }
  }, [refreshTrigger, currentPage, fetchBudgets]);

  // Handle page navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRetry = () => {
    fetchBudgets(currentPage);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget History</CardTitle>
        <CardDescription>View your past monthly budgets</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && budgets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">You haven't set any budgets yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Start by setting a budget for the current month.</p>
          </div>
        )}

        {/* Budget List */}
        {!isLoading && !error && budgets.length > 0 && (
          <div className="space-y-4">
            <ul className="space-y-0">
              {budgets.map((budget) => (
                <BudgetHistoryItem key={budget.id} budget={budget} />
              ))}
            </ul>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
