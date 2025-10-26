import type { MonthBudgetDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CurrentBudgetDisplayProps {
  budget: MonthBudgetDTO | null;
  isLoading: boolean;
}

/**
 * CurrentBudgetDisplay component
 * Shows current budget info for selected month with color-coded balance
 */
export function CurrentBudgetDisplay({ budget, isLoading }: CurrentBudgetDisplayProps) {
  // Format currency in PLN
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No budget set for this month
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine balance color
  const balanceColor = budget.current_balance >= 0 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Current Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Budget Amount:</span>
          <span className="text-sm font-semibold">
            {formatCurrency(budget.budget_set)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Remaining Balance:</span>
          <span className={`text-sm font-semibold ${balanceColor}`}>
            {formatCurrency(budget.current_balance)}
          </span>
        </div>

        {budget.current_balance < 0 && (
          <div className="mt-2 p-2 bg-destructive/10 rounded-md">
            <p className="text-xs text-destructive">
              ⚠️ You've exceeded your budget
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
