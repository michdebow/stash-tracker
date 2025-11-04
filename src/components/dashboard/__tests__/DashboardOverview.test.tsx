import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardOverview } from "../DashboardOverview";

const createFetchResponse = <T,>(payload: T, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  json: async () => payload,
});

describe("DashboardOverview", () => {
  const fetchMock = vi.fn<[], Promise<ReturnType<typeof createFetchResponse>>>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("displays dashboard summaries after a successful fetch", async () => {
    const dashboardPayload = {
      stashes: {
        totalStashes: 2,
        totalBalance: 1500,
        stashes: [
          { id: "stash-1", name: "Emergency Fund", current_balance: 1000 },
          { id: "stash-2", name: "Vacation", current_balance: 500 },
        ],
      },
      budget: {
        yearMonth: "2025-01",
        budgetSet: 2000,
        totalExpenses: 750,
        currentBalance: 1250,
        hasNoBudget: false,
      },
    } as const;

    fetchMock.mockResolvedValueOnce(createFetchResponse(dashboardPayload));

    render(<DashboardOverview />);

    await screen.findByRole("heading", { name: "Dashboard" });

    expect(screen.getByText("Your savings overview")).toBeInTheDocument();
    expect(screen.getByText("Overview of your stashes and budget for January 2025")).toBeInTheDocument();
    expect(screen.getByText("Total Stashes")).toBeInTheDocument();
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("1500,00 zł")).toBeInTheDocument();
    expect(screen.getByText("Recent Stashes")).toBeInTheDocument();
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("2000,00 zł")).toBeInTheDocument();
    expect(screen.getByText("750,00 zł")).toBeInTheDocument();
    expect(screen.getByText("1250,00 zł")).toBeInTheDocument();
    expect(screen.getByText("Budget Usage")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard");
  });

  it("renders an error alert when the dashboard request fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    fetchMock.mockResolvedValueOnce(createFetchResponse({ message: "Server unavailable" }, { ok: false, status: 500 }));

    render(<DashboardOverview />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data. Please try again.")).toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });

  it("handles dashboards without an active budget but with expenses", async () => {
    const dashboardPayload = {
      stashes: {
        totalStashes: 0,
        totalBalance: 0,
        stashes: [],
      },
      budget: {
        yearMonth: "2025-02",
        budgetSet: null,
        totalExpenses: 320,
        currentBalance: null,
        hasNoBudget: true,
      },
    } as const;

    fetchMock.mockResolvedValueOnce(createFetchResponse(dashboardPayload));

    render(<DashboardOverview />);

    await screen.findByText("No budget set for February 2025");

    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(screen.getByText("320,00 zł")).toBeInTheDocument();
    expect(screen.queryByText("Budget Set")).not.toBeInTheDocument();
  });
});
