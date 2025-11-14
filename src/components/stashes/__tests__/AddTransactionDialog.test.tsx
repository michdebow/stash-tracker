import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AddTransactionDialog } from "../AddTransactionDialog";

const createFetchResponse = <T,>(payload: T, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => payload,
});

describe("AddTransactionDialog", () => {
  const fetchMock = vi.fn<[], Promise<ReturnType<typeof createFetchResponse>>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits a deposit successfully and resets the form", async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    fetchMock.mockResolvedValueOnce(createFetchResponse({}));

    render(
      <AddTransactionDialog
        stashId="stash-123"
        transactionType="deposit"
        currentBalance={500}
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/Amount/), {
      target: { value: "150.75" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "Monthly top-up" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Funds" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stashes/stash-123/transactions");
    expect(JSON.parse((requestInit?.body as string) ?? "{}")).toEqual({
      transaction_type: "deposit",
      amount: 150.75,
      description: "Monthly top-up",
    });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect((screen.getByLabelText(/Amount/) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Description (optional)") as HTMLInputElement).value).toBe("");
  });

  it("rejects non-positive amounts before calling the API", () => {
    const onOpenChange = vi.fn();

    render(
      <AddTransactionDialog
        stashId="stash-123"
        transactionType="deposit"
        currentBalance={500}
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/Amount/), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Funds" }));

    expect(screen.getByText("Amount must be a positive number")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("blocks withdrawals that exceed the current balance", () => {
    render(
      <AddTransactionDialog
        stashId="stash-123"
        transactionType="withdrawal"
        currentBalance={100}
        open
        onOpenChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/Amount/), {
      target: { value: "250" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

    expect(screen.getByText("Withdrawal amount cannot exceed current balance")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces server-side validation errors", async () => {
    const onOpenChange = vi.fn();

    fetchMock.mockResolvedValueOnce(
      createFetchResponse({ errors: { amount: "Amount too precise" } }, { ok: false, status: 422 })
    );

    render(
      <AddTransactionDialog
        stashId="stash-123"
        transactionType="deposit"
        currentBalance={500}
        open
        onOpenChange={onOpenChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/Amount/), {
      target: { value: "100.123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Funds" }));

    await waitFor(() => {
      expect(screen.getByText("Amount too precise")).toBeInTheDocument();
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
