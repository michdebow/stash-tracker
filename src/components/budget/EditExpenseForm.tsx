import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExpenseCategoryDTO, ExpenseListItemDTO } from "@/types";

interface EditExpenseFormProps {
  expense: ExpenseListItemDTO;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * EditExpenseForm component
 * Form for editing an existing expense
 */
export function EditExpenseForm({ expense, onSuccess, onCancel }: EditExpenseFormProps) {
  const [categories, setCategories] = useState<ExpenseCategoryDTO[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - initialize with expense values
  const [categoryId, setCategoryId] = useState<string>(expense.category_id || "");
  const [amount, setAmount] = useState<string>(expense.amount.toString());
  const [expenseDate, setExpenseDate] = useState<string>(expense.expense_date);
  const [description, setDescription] = useState<string>(expense.description);

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

      // Build update payload with only changed fields
      const updates: Record<string, unknown> = {};

      if (categoryId !== (expense.category_id || "")) {
        // If categoryId is empty string, we want to clear it (set to null)
        // Otherwise, send the category ID
        updates.category_id = categoryId || null;
      }
      if (amountNum !== expense.amount) {
        updates.amount = amountNum;
      }
      if (expenseDate !== expense.expense_date) {
        updates.expense_date = expenseDate;
      }
      if (description.trim() !== expense.description) {
        updates.description = description.trim();
      }

      // If nothing changed, just close the form
      if (Object.keys(updates).length === 0) {
        onCancel();
        return;
      }

      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update expense");
      }

      // Notify parent of success
      onSuccess();
    } catch (err) {
      console.error("Error updating expense:", err);
      setError(err instanceof Error ? err.message : "Failed to update expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description *</Label>
        <Textarea
          id="edit-description"
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
        <Label htmlFor="edit-amount">Amount *</Label>
        <Input
          id="edit-amount"
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
        <Label htmlFor="edit-expense-date">Date *</Label>
        <Input
          id="edit-expense-date"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-category">Category</Label>
        <Select
          value={categoryId || "none"}
          onValueChange={(value) => setCategoryId(value === "none" ? "" : value)}
          disabled={isLoadingCategories || isSubmitting}
        >
          <SelectTrigger id="edit-category">
            <SelectValue placeholder="Select a category (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingCategories}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
