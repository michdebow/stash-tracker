import { useState, useEffect, useCallback } from "react";
import type { MonthBudgetDTO, ErrorResponse } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface BudgetDetailsProps {
  yearMonth: string;
  refreshTrigger?: number;
}

/**
 * BudgetDetails component
 * Displays detailed information about a specific month's budget
 */
export function BudgetDetails({ yearMonth, refreshTrigger = 0 }: BudgetDetailsProps) {
  const [budget, setBudget] = useState<MonthBudgetDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format year-month to readable label
  const formatMonthLabel = (ym: string): string => {
    const [year, month] = ym.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    return `${monthName} ${year}`;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  // Fetch budget details
  const fetchBudget = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/month-budgets/${yearMonth}`);

      if (response.status === 404) {
        setBudget(null);
        setError("No budget set for this month");
        return;
      }

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        setError(errorData.message || "Failed to fetch budget details");
        return;
      }

      const data = (await response.json()) as { data: MonthBudgetDTO };
      setBudget(data.data);
    } catch (err) {
      console.error("Error fetching budget details:", err);
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  }, [yearMonth]);

  // Fetch on mount and when yearMonth or refreshTrigger changes
  useEffect(() => {
    fetchBudget();
  }, [refreshTrigger, fetchBudget]);

  const handleRetry = () => {
    fetchBudget();
  };

  // Calculate spent amount and percentage
  // Note: current_balance = budget_set - total_expenses (from database trigger)
  const budgetSpent = budget ? budget.budget_set - budget.current_balance : 0;
  const remainingBudget = budget ? budget.current_balance : 0;
  const percentageSpent = budget ? (budgetSpent / budget.budget_set) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget for {formatMonthLabel(yearMonth)}</CardTitle>
        <CardDescription>View your budget details and spending progress</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </div>
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

        {/* Budget Details */}
        {!isLoading && !error && budget && (
          <div className="space-y-6">
            {/* Budget Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Budget Set</p>
                <p className="text-2xl font-bold" data-testid="set-budget-amount">
                  {formatCurrency(budget.budget_set)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(budgetSpent)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p
                  className={`text-2xl font-bold ${remainingBudget >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                >
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spending Progress</span>
                <span className="font-medium">{percentageSpent.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    percentageSpent > 100 ? "bg-destructive" : percentageSpent > 80 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                />
              </div>
            </div>

            {/* Over Budget Warning */}
            {percentageSpent > 100 && (
              <Alert variant="destructive">
                <p className="text-sm font-medium">
                  ⚠️ You have exceeded your budget by {formatCurrency(Math.abs(remainingBudget))}
                </p>
              </Alert>
            )}

            {/* Near Budget Warning */}
            {percentageSpent > 80 && percentageSpent <= 100 && (
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ You have used {percentageSpent.toFixed(1)}% of your budget
                </p>
              </Alert>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <p>Created: {new Date(budget.created_at).toLocaleString("en-US")}</p>
              <p>Last updated: {new Date(budget.updated_at).toLocaleString("en-US")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
