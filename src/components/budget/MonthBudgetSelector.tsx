import { useEffect, useState } from "react";
import type { MonthBudgetListItemDTO, ApiPaginatedResponse, ErrorResponse } from "@/types";
import { Label } from "@/components/ui/label";

interface MonthBudgetSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  refreshTrigger?: number;
}

/**
 * MonthBudgetSelector component
 * Displays a dropdown of months that have budgets set
 * Defaults to current month
 */
export function MonthBudgetSelector({ value, onChange, disabled = false, refreshTrigger = 0 }: MonthBudgetSelectorProps) {
  const [availableMonths, setAvailableMonths] = useState<MonthBudgetListItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all available months with budgets
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all budgets (high limit to get all)
        const params = new URLSearchParams({
          page: "1",
          limit: "60",
          order: "desc",
        });

        const response = await fetch(`/api/month-budgets?${params.toString()}`);

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const errorData = (await response.json()) as ErrorResponse;
          setError(errorData.message || "Failed to fetch available months");
          return;
        }

        const data = (await response.json()) as ApiPaginatedResponse<MonthBudgetListItemDTO>;
        setAvailableMonths(data.data);

        // If current value is not in the list and there are budgets, select the first one
        if (data.data.length > 0 && !data.data.some((b) => b.year_month === value)) {
          onChange(data.data[0].year_month);
        }
      } catch (err) {
        console.error("Error fetching available months:", err);
        setError("Unable to load months");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableMonths();
  }, [value, onChange, refreshTrigger]);

  // Format year-month to readable label
  const formatMonthLabel = (yearMonth: string): string => {
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    return `${monthName} ${year}`;
  };

  // Get current month in YYYY-MM format
  const getCurrentMonth = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const currentMonth = getCurrentMonth();

  return (
    <div className="space-y-2">
      <Label htmlFor="month-budget-selector">Select Month</Label>
      {isLoading ? (
        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
          Loading months...
        </div>
      ) : error ? (
        <div className="flex h-10 w-full items-center rounded-md border border-destructive bg-background px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : availableMonths.length === 0 ? (
        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
          No budgets set yet
        </div>
      ) : (
        <select
          id="month-budget-selector"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Select month to view budget"
        >
          {availableMonths.map((budget) => (
            <option key={budget.id} value={budget.year_month}>
              {formatMonthLabel(budget.year_month)}
              {budget.year_month === currentMonth && " (Current)"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
