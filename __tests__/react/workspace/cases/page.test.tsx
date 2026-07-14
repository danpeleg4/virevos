import React from "react";
import { render } from "vitest-browser-react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(() => []),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock("axios");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/workspace/cases", () => ({
  changeCaseStatus: vi.fn(),
  createCase: vi.fn(),
  updateCase: vi.fn(),
  deleteCase: vi.fn(),
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
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockCasesData,
      isLoading: false,
      error: null,
    });
  });

  it("renders case names", async () => {
    const screen = await render(<CasesPage />);
    await expect
      .element(screen.getByText("Website Redesign"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Mobile App")).toBeInTheDocument();
  });

  it("renders case status indicators", async () => {
    const screen = await render(<CasesPage />);
    await expect
      .element(screen.getByText(/active|completed/i).first())
      .toBeInTheDocument();
  });
});
