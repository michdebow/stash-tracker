import { useState, useEffect, useCallback } from "react";
import type { MonthBudgetDTO, UpsertBudgetCommand, ErrorResponse, ValidationErrorResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { MonthSelector } from "./MonthSelector";
import { CurrentBudgetDisplay } from "./CurrentBudgetDisplay";

interface SetBudgetFormProps {
  onSuccess?: () => void;
}

/**
 * SetBudgetForm component
 * Interactive form for setting/updating monthly budget using UPSERT pattern
 */
export function SetBudgetForm({ onSuccess }: SetBudgetFormProps) {
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // State management
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [budgetAmount, setBudgetAmount] = useState<string>("");
  const [currentBudget, setCurrentBudget] = useState<MonthBudgetDTO | null>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current budget for selected month
  const fetchCurrentBudget = useCallback(async (yearMonth: string) => {
    setIsLoadingCurrent(true);
    setError(null);

    try {
      const response = await fetch(`/api/month-budgets/${yearMonth}`);

      if (response.status === 404) {
        // No budget exists for this month
        setCurrentBudget(null);
        setBudgetAmount("");
        return;
      }

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        setError(errorData.message || "Failed to fetch current budget");
        return;
      }

      const data = (await response.json()) as { data: MonthBudgetDTO };
      setCurrentBudget(data.data);
      setBudgetAmount(data.data.budget_set.toString());
    } catch (err) {
      console.error("Error fetching current budget:", err);
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  // Fetch budget on mount and when month changes
  useEffect(() => {
    fetchCurrentBudget(selectedMonth);
  }, [selectedMonth, fetchCurrentBudget]);

  // Handle month change
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!budgetAmount || budgetAmount.trim() === "") {
      errors.budget_set = "Budget amount is required";
      setFieldErrors(errors);
      return false;
    }

    const amount = parseFloat(budgetAmount);
    if (isNaN(amount)) {
      errors.budget_set = "Budget amount must be a valid number";
      setFieldErrors(errors);
      return false;
    }

    if (amount <= 0) {
      errors.budget_set = "Budget amount must be greater than 0";
      setFieldErrors(errors);
      return false;
    }

    // Check max 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(budgetAmount)) {
      errors.budget_set = "Budget amount can have at most 2 decimal places";
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Validate
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const command: UpsertBudgetCommand = {
        budget_set: parseFloat(budgetAmount),
      };

      const response = await fetch(`/api/month-budgets/${selectedMonth}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 400 || response.status === 422) {
        const errorData = (await response.json()) as ValidationErrorResponse;

        if (errorData.errors) {
          setFieldErrors(errorData.errors);
        } else {
          setError(errorData.message || "Validation failed");
        }
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        setError(errorData.message || "Something went wrong. Please try again later.");
        return;
      }

      const data = (await response.json()) as { data: MonthBudgetDTO };
      setCurrentBudget(data.data);
      setSuccessMessage(currentBudget ? "Budget updated successfully!" : "Budget created successfully!");

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error submitting budget:", err);
      setError("Unable to connect. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Month Selector */}
      <MonthSelector value={selectedMonth} onChange={handleMonthChange} disabled={isSubmitting} />

      {/* Current Budget Display */}
      <CurrentBudgetDisplay budget={currentBudget} isLoading={isLoadingCurrent} />

      {/* Budget Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="budget-amount">Budget Amount (PLN)</Label>
        <Input
          id="budget-amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Enter budget amount"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          disabled={isSubmitting}
          required
          aria-describedby={fieldErrors.budget_set ? "budget-amount-error" : undefined}
          aria-invalid={!!fieldErrors.budget_set}
        />
        {fieldErrors.budget_set && (
          <p id="budget-amount-error" className="text-sm text-destructive">
            {fieldErrors.budget_set}
          </p>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">✓ {successMessage}</p>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || !budgetAmount} className="w-full">
        {isSubmitting ? "Saving..." : currentBudget ? "Update Budget" : "Set Budget"}
      </Button>
    </form>
  );
}
