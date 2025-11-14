import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpenseList } from "../ExpenseList";

vi.mock("../EditExpenseForm", () => ({
  EditExpenseForm: () => <div data-testid="edit-expense-form" />,
}));

const createFetchResponse = <T,>(payload: T, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => payload,
});

describe("ExpenseList", () => {
  const fetchMock = vi.fn<[], Promise<ReturnType<typeof createFetchResponse>>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders formatted expense data when fetch succeeds", async () => {
    const category = {
      id: "cat-1",
      display_name: "Food",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    } as const;

    const expense = {
      id: "exp-1",
      category_id: category.id,
      amount: 123.45,
      expense_date: "2025-01-15",
      year_month: "2025-01",
      description: "Groceries",
      created_at: "2025-01-15T10:00:00Z",
    } as const;

    fetchMock
      .mockResolvedValueOnce(createFetchResponse({ data: [category] }))
      .mockResolvedValueOnce(createFetchResponse({ data: [expense] }));

    render(<ExpenseList yearMonth="2025-01" refreshTrigger={0} />);

    await screen.findByText("1 expense this month");

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Jan 15, 2025")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText(/123,45/)).toHaveTextContent("123,45");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/expense-categories");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/expenses?");
  });

  it("renders empty state when expenses fetch returns no data", async () => {
    fetchMock
      .mockResolvedValueOnce(createFetchResponse({ data: [] }))
      .mockResolvedValueOnce(createFetchResponse({ data: [] }));

    render(<ExpenseList yearMonth="2025-01" refreshTrigger={0} />);

    await screen.findByText("0 expenses this month");

    expect(screen.getByText("No expenses recorded for this month.")).toBeInTheDocument();
  });

  it("renders an error message when the expenses request fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    fetchMock
      .mockResolvedValueOnce(createFetchResponse({ data: [] }))
      .mockResolvedValueOnce(createFetchResponse({ message: "Backend unavailable" }, { ok: false, status: 500 }));

    render(<ExpenseList yearMonth="2025-01" refreshTrigger={0} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load expenses")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
