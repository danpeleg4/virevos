import React from "react";
import { render, screen } from "@testing-library/react";

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockUseQueryClient = jest.fn(() => ({
  cancelQueries: jest.fn(),
  getQueryData: jest.fn(() => []),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock("axios");
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/cases", () => ({
  changeCaseStatus: jest.fn(),
  createCase: jest.fn(),
  updateCase: jest.fn(),
  deleteCase: jest.fn(),
}));

const mockCasesData = {
  cases: [
    {
      id: 1,
      clientId: null,
      name: "Website Redesign",
      status: "active",
      clientName: "Acme",
      dueDate: "2026-06-01",
      priority: "medium",
      stats: { totalTasks: 5, completedTasks: 2, percentage: 40 },
    },
    {
      id: 2,
      clientId: null,
      name: "Mobile App",
      status: "completed",
      clientName: "Beta",
      dueDate: "2026-05-01",
      priority: "high",
      stats: { totalTasks: 3, completedTasks: 3, percentage: 100 },
    },
  ],
  allClients: [
    { id: 1, name: "Acme" },
    { id: 2, name: "Beta" },
  ],
};

import CasesPage from "@/app/workspace/cases/page";

describe("Cases Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockCasesData,
      isLoading: false,
      error: null,
    });
  });

  it("renders case names", () => {
    render(<CasesPage />);
    expect(screen.getByText("Website Redesign")).toBeInTheDocument();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
  });

  it("renders case status indicators", () => {
    render(<CasesPage />);
    expect(screen.getAllByText(/active|completed/i).length).toBeGreaterThan(0);
  });
});
