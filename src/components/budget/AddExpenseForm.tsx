import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseCategoryDTO } from "@/types";

interface AddExpenseFormProps {
  yearMonth: string;
  onSuccess: () => void;
}

/**
 * AddExpenseForm component
 * Form for creating a new expense
 */
export function AddExpenseForm({ yearMonth, onSuccess }: AddExpenseFormProps) {
  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Load expense categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch("/api/expense-categories");

        if (!response.ok) {
          throw new Error("Failed to load expense categories");
        }

        const result = await response.json();
        setCategories(result.data || []);
      } catch (err) {
        console.error("Error loading categories:", err);
        setError("Failed to load expense categories");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Set default expense date to current date in selected month
  useEffect(() => {
    if (!expenseDate && yearMonth) {
      // Set to first day of selected month
      setExpenseDate(`${yearMonth}-01`);
    }
  }, [yearMonth, expenseDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!description.trim() || !amount || !expenseDate) {
      setError("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: categoryId || undefined,
          amount: amountNum,
          expense_date: expenseDate,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create expense");
      }

      // Reset form
      setCategoryId("");
      setAmount("");
      setExpenseDate(`${yearMonth}-01`);
      setDescription("");

      // Notify parent of success
      onSuccess();
    } catch (err) {
      console.error("Error creating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="What did you spend on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-date">Date *</Label>
        <Input
          id="expense-date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={categoryId}
          onValueChange={setCategoryId}
          disabled={isLoadingCategories || isSubmitting}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category (optional)" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting || isLoadingCategories}>
          {isSubmitting ? "Adding..." : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
