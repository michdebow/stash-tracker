import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AddExpenseForm } from "../AddExpenseForm";

const createFetchResponse = <T,>(payload: T, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => payload,
});

describe("AddExpenseForm", () => {
  const fetchMock = vi.fn<[], Promise<ReturnType<typeof createFetchResponse>>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits a valid expense and resets the form", async () => {
    const onSuccess = vi.fn();

    fetchMock
      .mockResolvedValueOnce(
        createFetchResponse({
          data: [],
        })
      )
      .mockResolvedValueOnce(createFetchResponse({}));

    render(<AddExpenseForm yearMonth="2025-01" onSuccess={onSuccess} />);

    const dateInput = await screen.findByDisplayValue("2025-01-01");

    fireEvent.change(screen.getByLabelText("Description *"), {
      target: { value: "Groceries" },
    });
    fireEvent.change(screen.getByLabelText("Amount *"), {
      target: { value: "123.45" },
    });
    fireEvent.change(dateInput, {
      target: { value: "2025-01-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, requestInit] = fetchMock.mock.calls[1];
    const parsedBody = JSON.parse((requestInit?.body as string) ?? "{}");
    expect(parsedBody).toEqual({
      amount: 123.45,
      expense_date: "2025-01-15",
      description: "Groceries",
    });

    expect((screen.getByLabelText("Description *") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByLabelText("Amount *") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Date *") as HTMLInputElement).value).toBe("2025-01-01");
  });

  it("shows a required field error when description is missing", async () => {
    fetchMock.mockResolvedValue(createFetchResponse({ data: [] }));

    render(<AddExpenseForm yearMonth="2025-01" onSuccess={vi.fn()} />);

    await screen.findByDisplayValue("2025-01-01");

    fireEvent.change(screen.getByLabelText("Amount *"), {
      target: { value: "25" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));

    expect(await screen.findByText("Please fill in all required fields")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates that amount must be positive", async () => {
    fetchMock.mockResolvedValue(createFetchResponse({ data: [] }));

    render(<AddExpenseForm yearMonth="2025-01" onSuccess={vi.fn()} />);

    await screen.findByDisplayValue("2025-01-01");

    fireEvent.change(screen.getByLabelText("Description *"), {
      target: { value: "Lunch" },
    });
    fireEvent.change(screen.getByLabelText("Amount *"), {
      target: { value: "-15" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));

    expect(await screen.findByText("Amount must be a positive number")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
