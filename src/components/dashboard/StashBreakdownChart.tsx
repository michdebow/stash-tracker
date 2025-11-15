import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { StashDTO } from "@/types";

interface StashBreakdownChartProps {
  stashes: StashDTO[];
}

/**
 * Donut chart component displaying the breakdown of money distribution across stashes
 */
export function StashBreakdownChart({ stashes }: StashBreakdownChartProps) {
  const chartData = useMemo(() => {
    // Color palette for the chart - monochromatic shades of blue with high contrast (darkest first)
    const COLORS = [
      "#001f3f", // blue-950
      "#0c4a6e", // blue-900
      "#0e5a8a", // blue-800
      "#1e40af", // blue-700
      "#1d4ed8", // blue-600
      "#2563eb", // blue-500
      "#3b82f6", // blue-400
      "#60a5fa", // blue-300
      "#93c5fd", // blue-200
    ];

    return stashes
      .filter((stash) => stash.current_balance > 0)
      .map((stash, index) => ({
        name: stash.name,
        value: Math.round(stash.current_balance * 100) / 100,
        color: COLORS[index % COLORS.length],
      }));
  }, [stashes]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-center">
        <p className="text-sm text-muted-foreground">No stashes with balance to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
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
