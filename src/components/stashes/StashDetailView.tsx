import { useCallback } from "react";
import type { StashDetailsDTO } from "@/types";
import { useStashDetail } from "@/components/hooks/useStashDetail";
import { useStashTransactions } from "@/components/hooks/useStashTransactions";
import { StashDetailHeader } from "./StashDetailHeader";
import { TransactionList } from "./TransactionList";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StashDetailViewProps {
  initialStashData: StashDetailsDTO;
  stashId: string;
}

/**
 * Root component for the stash detail view
 * Orchestrates the header and transaction list components
 * Manages data refresh coordination between child components
 */
export function StashDetailView({ initialStashData, stashId }: StashDetailViewProps) {
  const {
    stash,
    isLoading: isLoadingStash,
    error: stashError,
    refreshData: refreshStash,
  } = useStashDetail(stashId, initialStashData);

  const {
    transactions,
    pagination,
    isLoading: isLoadingTransactions,
    error: transactionsError,
    setPage,
    refreshData: refreshTransactions,
  } = useStashTransactions(stashId);

  /**
   * Refresh both stash details and transactions
   * Called after successful transaction creation or deletion
   */
  const handleDataRefresh = useCallback(async () => {
    await Promise.all([refreshStash(), refreshTransactions()]);
  }, [refreshStash, refreshTransactions]);

  // Show error if stash failed to load
  if (stashError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{stashError.message || "Failed to load stash details. Please try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state if stash is still loading
  if (isLoadingStash || !stash) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <StashDetailHeader stash={stash} onTransactionSuccess={handleDataRefresh} />

      <TransactionList
        stashId={stashId}
        transactions={transactions}
        pagination={pagination}
        isLoading={isLoadingTransactions}
        error={transactionsError}
        onPageChange={setPage}
        onTransactionDeleted={handleDataRefresh}
      />
    </div>
  );
}
