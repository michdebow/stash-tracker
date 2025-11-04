import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddTransactionDialogProps {
  stashId: string;
  transactionType: "deposit" | "withdrawal";
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Dialog for adding a new transaction (deposit or withdrawal)
 * Validates withdrawal amounts against current balance
 */
export function AddTransactionDialog({
  stashId,
  transactionType,
  currentBalance,
  open,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isDeposit = transactionType === "deposit";
  const dialogTitle = isDeposit ? "Add Funds" : "Withdraw Funds";
  const dialogDescription = isDeposit
    ? "Add money to your stash"
    : "Withdraw money from your stash";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFieldErrors({ amount: "Amount must be a positive number" });
      setIsSubmitting(false);
      return;
    }

    // Validate withdrawal amount against current balance
    if (!isDeposit && amountNum > currentBalance) {
      setFieldErrors({ amount: "Withdrawal amount cannot exceed current balance" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/stashes/${stashId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_type: transactionType,
          amount: amountNum,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.status === 403) {
          setError("Insufficient balance for withdrawal");
          setIsSubmitting(false);
          return;
        }

        if (response.status === 400 || response.status === 422) {
          const errorData = await response.json();
          if (errorData.errors) {
            setFieldErrors(errorData.errors);
          } else {
            setError(errorData.message || "Validation failed");
          }
          setIsSubmitting(false);
          return;
        }

        const errorData = await response.json();
        setError(errorData.message || "Failed to create transaction");
        setIsSubmitting(false);
        return;
      }

      // Success - reset form and close dialog
      setAmount("");
      setDescription("");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAmount("");
      setDescription("");
      setError(null);
      setFieldErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (PLN) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.amount}
                aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                required
              />
              {fieldErrors.amount && (
                <p id="amount-error" className="text-sm text-destructive">
                  {fieldErrors.amount}
                </p>
              )}
              {!isDeposit && currentBalance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Available balance: {new Intl.NumberFormat("pl-PL", {
                    style: "currency",
                    currency: "PLN",
                  }).format(currentBalance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Add a note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                maxLength={1000}
                aria-invalid={!!fieldErrors.description}
                aria-describedby={fieldErrors.description ? "description-error" : undefined}
              />
              {fieldErrors.description && (
                <p id="description-error" className="text-sm text-destructive">
                  {fieldErrors.description}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : isDeposit ? "Add Funds" : "Withdraw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
