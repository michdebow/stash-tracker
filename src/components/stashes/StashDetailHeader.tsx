import { useState } from "react";
import type { StashDetailsDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle } from "lucide-react";
import { AddTransactionDialog } from "./AddTransactionDialog";

interface StashDetailHeaderProps {
  stash: StashDetailsDTO;
  onTransactionSuccess: () => void;
}

/**
 * Displays stash name, current balance, and action buttons
 * Provides "Add Funds" and "Withdraw" functionality
 */
export function StashDetailHeader({ stash, onTransactionSuccess }: StashDetailHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");

  const handleAddFunds = () => {
    setTransactionType("deposit");
    setDialogOpen(true);
  };

  const handleWithdraw = () => {
    setTransactionType("withdrawal");
    setDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    setDialogOpen(false);
    onTransactionSuccess();
  };

  // Format balance as PLN currency
  const formattedBalance = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(Number(stash.current_balance));

  // Format creation date
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(stash.created_at));

  const isWithdrawDisabled = Number(stash.current_balance) <= 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-3xl">{stash.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Created on {formattedDate}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddFunds} size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Add Funds
              </Button>
              <Button
                onClick={handleWithdraw}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={isWithdrawDisabled}
                aria-label={isWithdrawDisabled ? "Cannot withdraw from empty stash" : "Withdraw funds"}
              >
                <MinusCircle className="h-4 w-4" aria-hidden="true" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-4xl font-bold text-primary">{formattedBalance}</p>
          </div>
        </CardContent>
      </Card>

      <AddTransactionDialog
        stashId={stash.id}
        transactionType={transactionType}
        currentBalance={Number(stash.current_balance)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleTransactionSuccess}
      />
    </>
  );
}
