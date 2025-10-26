import { useState } from "react";
import { MonthBudgetSelector } from "./MonthBudgetSelector";
import { BudgetDetails } from "./BudgetDetails";
import { BudgetHistoryList } from "./BudgetHistoryList";
import { SetBudgetForm } from "./SetBudgetForm";
import { ExpenseList } from "./ExpenseList";
import { AddExpenseForm } from "./AddExpenseForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * BudgetView component
 * Main view for budget management with month selection
 */
export function BudgetView() {
  // Get current month in YYYY-MM format
  const getCurrentMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState<boolean>(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState<boolean>(false);

  const handleBudgetSuccess = () => {
    // Increment trigger to refresh components
    setRefreshTrigger((prev) => prev + 1);
    // Close dialog
    setIsBudgetDialogOpen(false);
  };

  const handleExpenseSuccess = () => {
    // Increment trigger to refresh components
    setRefreshTrigger((prev) => prev + 1);
    // Close dialog
    setIsExpenseDialogOpen(false);
  };

  const handleExpenseDeleted = () => {
    // Increment trigger to refresh budget details
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-8">
      {/* Header with Month Selector and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <MonthBudgetSelector
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Add Expense</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
                <DialogDescription>
                  Record a new expense for the selected month
                </DialogDescription>
              </DialogHeader>
              <AddExpenseForm yearMonth={selectedMonth} onSuccess={handleExpenseSuccess} />
            </DialogContent>
          </Dialog>
          <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button>Set/Edit Budget</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Manage Budget</DialogTitle>
                <DialogDescription>
                  Create or update your monthly budget
                </DialogDescription>
              </DialogHeader>
              <SetBudgetForm onSuccess={handleBudgetSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Details and History */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <BudgetDetails
            yearMonth={selectedMonth}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div>
          <BudgetHistoryList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Expense List */}
      <div>
        <ExpenseList
          yearMonth={selectedMonth}
          refreshTrigger={refreshTrigger}
          onExpenseDeleted={handleExpenseDeleted}
        />
      </div>
    </div>
  );
}
