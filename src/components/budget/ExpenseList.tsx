import { useState, useEffect } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditExpenseForm } from "./EditExpenseForm";
import type { ExpenseListItemDTO, ExpenseCategoryDTO } from "@/types";

interface ExpenseListProps {
  yearMonth: string;
  refreshTrigger: number;
  onExpenseDeleted?: () => void;
}

/**
 * ExpenseList component
 * Displays a list of expenses for the selected month with delete functionality
 */
export function ExpenseList({ yearMonth, refreshTrigger, onExpenseDeleted }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<ExpenseListItemDTO[]>([]);
  const [categories, setCategories] = useState<Map<string, ExpenseCategoryDTO>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseListItemDTO | null>(null);

  // Load expense categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/expense-categories");

        if (!response.ok) {
          throw new Error("Failed to load expense categories");
        }

        const result = await response.json();
        const categoryMap = new Map<string, ExpenseCategoryDTO>();
        (result.data || []).forEach((cat: ExpenseCategoryDTO) => {
          categoryMap.set(cat.id, cat);
        });
        setCategories(categoryMap);
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };

    fetchCategories();
  }, []);

  // Load expenses for the selected month
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          yearMonth,
          limit: "100",
          sort: "expense_date",
          order: "desc",
        });

        const response = await fetch(`/api/expenses?${params}`);

        if (!response.ok) {
          throw new Error("Failed to load expenses");
        }

        const result = await response.json();
        setExpenses(result.data || []);
      } catch (err) {
        console.error("Error loading expenses:", err);
        setError("Failed to load expenses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [yearMonth, refreshTrigger]);

  const handleDeleteClick = (expenseId: string) => {
    // Clear any previous delete errors when opening dialog
    setDeleteError(null);
    setDeleteExpenseId(expenseId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteExpenseId) return;

    try {
      setIsDeleting(true);

      console.log("Deleting expense:", deleteExpenseId);
      const response = await fetch(`/api/expenses/${deleteExpenseId}`, {
        method: "DELETE",
      });

      console.log("Delete response status:", response.status);

      if (!response.ok) {
        // Only try to parse JSON if there's content (not 204)
        let errorMessage = "Failed to delete expense";
        if (response.status !== 204) {
          try {
            const errorData = await response.json();
            console.error("Delete error response:", errorData);
            errorMessage = errorData.message || errorMessage;
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            // If JSON parsing fails, use default message
          }
        }
        throw new Error(errorMessage);
      }

      // Success - optimistically remove the expense from the list immediately
      const deletedId = deleteExpenseId;
      setExpenses((prev) => prev.filter((exp) => exp.id !== deletedId));

      // Close the dialog
      setDeleteExpenseId(null);
      setDeleteError(null);

      // Notify parent component to refresh budget details
      // This will also trigger a re-fetch of expenses to ensure consistency
      if (onExpenseDeleted) {
        onExpenseDeleted();
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete expense");
      // Keep dialog open on error so user can see the error and retry
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (expense: ExpenseListItemDTO) => {
    console.log("Edit clicked for expense:", expense.id);
    console.log("Setting editExpense state to:", expense);
    setEditExpense(expense);
  };

  const handleEditSuccess = () => {
    console.log("Edit success - closing dialog");
    // Close the edit dialog
    setEditExpense(null);

    // Notify parent component to refresh budget details and expenses list
    if (onExpenseDeleted) {
      onExpenseDeleted();
    }
  };

  const handleEditCancel = () => {
    console.log("Edit cancelled - closing dialog");
    setEditExpense(null);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return "";
    return categories.get(categoryId)?.display_name || "Unknown";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>Loading expenses...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded for this month.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">{expense.description}</span>
                      <span className="text-sm text-muted-foreground">{formatDate(expense.expense_date)}</span>
                    </div>
                    {expense.category_id && (
                      <p className="text-sm text-muted-foreground mt-1">{getCategoryName(expense.category_id)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="font-semibold tabular-nums">{formatAmount(expense.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(expense)}
                      disabled={!!editExpense || !!deleteExpenseId}
                      className="h-8 w-8 hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit expense</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(expense.id)}
                      disabled={!!editExpense || deleteExpenseId === expense.id}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete expense</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editExpense}
        onOpenChange={(open) => {
          if (!open) {
            handleEditCancel();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details of your expense.</DialogDescription>
          </DialogHeader>
          {editExpense && (
            <EditExpenseForm expense={editExpense} onSuccess={handleEditSuccess} onCancel={handleEditCancel} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteExpenseId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteExpenseId(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{deleteError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
