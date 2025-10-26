import { Label } from "@/components/ui/label";

interface MonthSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * MonthSelector component for choosing year-month
 * Generates options from 12 months in the past to 12 months in the future
 */
export function MonthSelector({ value, onChange, disabled = false }: MonthSelectorProps) {
  // Generate month options (12 months past to 12 months future)
  const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    
    // Start from 12 months ago
    for (let i = -12; i <= 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}-${month}`;
      
      // Format as "Month YYYY"
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      const label = `${monthName} ${year}`;
      
      options.push({ value: yearMonth, label });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <div className="space-y-2">
      <Label htmlFor="month-selector">Month</Label>
      <select
        id="month-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Select month for budget"
      >
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
