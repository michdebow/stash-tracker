import type { MonthBudgetListItemDTO } from "@/types";

interface BudgetHistoryItemProps {
  budget: MonthBudgetListItemDTO;
}

/**
 * BudgetHistoryItem component
 * Displays a single month's budget information in the history list
 */
export function BudgetHistoryItem({ budget }: BudgetHistoryItemProps) {
  // Format currency in PLN
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  // Format year-month as "Month YYYY"
  const formatMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    return `${monthName} ${year}`;
  };

  // Determine balance color
  const balanceColor =
    budget.current_balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <li className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="font-medium text-sm">{formatMonth(budget.year_month)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Budget: {formatCurrency(budget.budget_set)}</p>
      </div>

      <div className="text-right">
        <p className="text-xs text-muted-foreground">Balance</p>
        <p className={`font-semibold text-sm ${balanceColor}`}>{formatCurrency(budget.current_balance)}</p>
      </div>
    </li>
  );
}
