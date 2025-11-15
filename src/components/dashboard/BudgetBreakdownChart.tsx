import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface BudgetBreakdownChartProps {
  budgetSet: number;
  totalExpenses: number;
}

/**
 * Donut chart component displaying budget usage breakdown
 */
export function BudgetBreakdownChart({ budgetSet, totalExpenses }: BudgetBreakdownChartProps) {
  // Color palette - monochromatic shades of blue with high contrast (darkest first)
  const COLORS = {
    used: "rgba(0,31,63,0.16)", // blue-900 for expenses
    remaining: "#0e5a8a", // blue-300 for remaining budget
  };

  const chartData = useMemo(() => {
    const remaining = Math.max(0, budgetSet - totalExpenses);
    return [
      {
        name: "Expenses",
        value: Math.round(totalExpenses * 100) / 100,
        color: COLORS.used,
      },
      {
        name: "Remaining",
        value: Math.round(remaining * 100) / 100,
        color: COLORS.remaining,
      },
    ];
  }, [budgetSet, totalExpenses, COLORS.used, COLORS.remaining]);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `${new Intl.NumberFormat("pl-PL", {
                style: "currency",
                currency: "PLN",
              }).format(value)}`
            }
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
