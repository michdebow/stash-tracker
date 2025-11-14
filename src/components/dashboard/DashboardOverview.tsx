import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/types";

/**
 * Main dashboard component that displays stashes and budget overview
 */
export function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your stashes and budget for {formatYearMonth(data.budget.yearMonth)}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stashes Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Stashes</CardTitle>
            <CardDescription>Your savings overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Stashes</span>
              <span className="text-2xl font-bold">{data.stashes.totalStashes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
              <span className="text-2xl font-bold">{formatCurrency(data.stashes.totalBalance)}</span>
            </div>

            {data.stashes.stashes.length > 0 ? (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold">Recent Stashes</h4>
                <div className="space-y-2">
                  {data.stashes.stashes.slice(0, 5).map((stash) => (
                    <div key={stash.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">{stash.name}</span>
                      <span className="text-sm font-semibold">{formatCurrency(stash.current_balance)}</span>
                    </div>
                  ))}
                </div>
                {data.stashes.stashes.length > 5 && (
                  <a href="/app/stashes" className="inline-block text-sm text-primary hover:underline mt-2">
                    View all stashes →
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">You don't have any stashes yet</p>
                <a
                  href="/app/stashes"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Create Your First Stash
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
            <CardDescription>{formatYearMonth(data.budget.yearMonth)} overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budget.hasNoBudget ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No budget set for {formatYearMonth(data.budget.yearMonth)}
                </p>
                <a
                  href="/app/budget"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Set Budget
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Budget Set</span>
                  <span className="text-2xl font-bold">{formatCurrency(data.budget.budgetSet ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
                  <span className="text-2xl font-bold text-destructive">
                    {formatCurrency(data.budget.totalExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm font-medium text-muted-foreground">Remaining</span>
                  <span
                    className={`text-2xl font-bold ${
                      (data.budget.currentBalance ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(data.budget.currentBalance ?? 0)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Budget Usage</span>
                    <span className="font-medium">
                      {calculateBudgetPercentage(data.budget.totalExpenses, data.budget.budgetSet ?? 0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        calculateBudgetPercentage(data.budget.totalExpenses, data.budget.budgetSet ?? 0) > 100
                          ? "bg-destructive"
                          : calculateBudgetPercentage(data.budget.totalExpenses, data.budget.budgetSet ?? 0) > 80
                            ? "bg-yellow-500"
                            : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(calculateBudgetPercentage(data.budget.totalExpenses, data.budget.budgetSet ?? 0), 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <a href="/app/budget" className="inline-block text-sm text-primary hover:underline mt-4">
                  View detailed budget →
                </a>
              </>
            )}

            {/* Show total expenses even if no budget is set */}
            {data.budget.hasNoBudget && data.budget.totalExpenses > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
                  <span className="text-xl font-bold text-destructive">
                    {formatCurrency(data.budget.totalExpenses)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/app/stashes"
              className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add Stash</span>
            </a>
            <a
              href="/app/budget"
              className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">Add Expense</span>
            </a>
            <a
              href="/app/budget"
              className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium">Set Budget</span>
            </a>
            <a
              href="/app/stashes"
              className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              <span className="text-sm font-medium">Stash Transaction</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton loader for dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full mt-6" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Format currency value to PLN
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
}

/**
 * Format year-month string to readable format
 */
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

/**
 * Calculate budget usage percentage
 */
function calculateBudgetPercentage(expenses: number, budget: number): number {
  if (budget === 0) return 0;
  return Math.round((expenses / budget) * 100);
}
