import type { StashTransactionDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { TransactionListItem } from "./TransactionListItem";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface TransactionListProps {
  stashId: string;
  transactions: StashTransactionDTO[];
  pagination: PaginationState;
  isLoading: boolean;
  error: Error | null;
  onPageChange: (page: number) => void;
  onTransactionDeleted: () => void;
}

/**
 * Displays a paginated list of transactions with loading and empty states
 */
export function TransactionList({
  stashId,
  transactions,
  pagination,
  isLoading,
  error,
  onPageChange,
  onTransactionDeleted,
}: TransactionListProps) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasTransactions = transactions.length > 0;

  // Calculate pagination range
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Error state */}
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{error.message || "Failed to load transactions. Please try again."}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !error && (
          <div className="space-y-4 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="h-5 w-5 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && !hasTransactions && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start by adding funds to your stash or making a withdrawal.
            </p>
          </div>
        )}

        {/* Transaction list */}
        {!isLoading && !error && hasTransactions && (
          <div>
            <div className="divide-y divide-border">
              {transactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  stashId={stashId}
                  onDeleteSuccess={onTransactionDeleted}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {pagination.total} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {pagination.page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page === totalPages}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
