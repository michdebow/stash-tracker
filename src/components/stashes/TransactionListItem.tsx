import { useState } from "react";
import type { StashTransactionDTO } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, MoreVertical, Trash2 } from "lucide-react";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog";

interface TransactionListItemProps {
  transaction: StashTransactionDTO;
  stashId: string;
  onDeleteSuccess: () => void;
}

/**
 * Renders a single transaction item with type indicator, amount, description, and delete action
 */
export function TransactionListItem({ transaction, stashId, onDeleteSuccess }: TransactionListItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDeposit = transaction.transaction_type === "deposit";

  // Format amount with sign and currency
  const formattedAmount = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(Number(transaction.amount));

  const amountWithSign = isDeposit ? `+${formattedAmount}` : `-${formattedAmount}`;

  // Format date and time
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(transaction.created_at));

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <div className="flex items-start justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3 flex-1">
          {/* Transaction type icon */}
          <div
            className={`mt-1 ${isDeposit ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}
            aria-hidden="true"
          >
            {isDeposit ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
          </div>

          {/* Transaction details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`text-lg font-semibold ${
                  isDeposit ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                }`}
              >
                {amountWithSign}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{transaction.transaction_type}</span>
            </div>

            {transaction.description && (
              <p className="text-sm text-muted-foreground mt-1 break-words">{transaction.description}</p>
            )}

            <time className="text-xs text-muted-foreground mt-1 block" dateTime={transaction.created_at}>
              {formattedDate}
            </time>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={handleMenuClick}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Transaction actions">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={handleMenuClick}>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setDeleteDialogOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteTransactionDialog
        transactionId={transaction.id}
        stashId={stashId}
        transactionAmount={formattedAmount}
        transactionType={transaction.transaction_type}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={onDeleteSuccess}
      />
    </>
  );
}
