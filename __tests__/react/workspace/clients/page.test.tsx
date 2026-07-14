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
vi.mock("@/lib/workspace/clients", () => ({
  addAClient: vi.fn(),
  deleteClient: vi.fn(),
  updateExistingClient: vi.fn(),
}));

const mockClients = [
  {
    id: 1,
    name: "Acme Corp",
    email: "acme@example.com",
    phone: "555-1234",
    status: "active",
    activeCases: 2,
    completedCases: 1,
    totalCases: 3,
    avatar: "A",
  },
  {
    id: 2,
    name: "Beta LLC",
    email: "beta@example.com",
    phone: "555-5678",
    status: "inactive",
    activeCases: 0,
    completedCases: 2,
    totalCases: 2,
    avatar: "B",
  },
];

import Clients from "@/app/workspace/clients/page";

describe("Clients Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockClients,
      isLoading: false,
      error: null,
    });
  });

  it("renders clients table with client names", async () => {
    const screen = await render(<Clients />);
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
    await expect.element(screen.getByText("Beta LLC")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await render(<Clients />);
    await expect
      .element(screen.getByPlaceholder(/search clients/i))
      .toBeInTheDocument();
  });

  it("renders Add Client button", async () => {
    const screen = await render(<Clients />);
    await expect
      .element(screen.getByRole("button", { name: /add client/i }))
      .toBeInTheDocument();
  });

  it("opens add client dialog when button is clicked", async () => {
    const screen = await render(<Clients />);
    await screen.getByRole("button", { name: /add client/i }).click();
    await expect
      .element(screen.getByText("Add New Client", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders client status badges", async () => {
    const screen = await render(<Clients />);
    await expect
      .element(screen.getByText("Active", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Inactive", { exact: true }))
      .toBeInTheDocument();
  });

  it("filters clients by search query", async () => {
    const screen = await render(<Clients />);
    await screen.getByPlaceholder(/search clients/i).fill("acme");
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
    await expect.element(screen.getByText("Beta LLC")).not.toBeInTheDocument();
  });

  it("renders pagination controls", async () => {
    const screen = await render(<Clients />);
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeInTheDocument();
  });

  it("shows empty state when no clients", async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    const screen = await render(<Clients />);
    await expect
      .element(screen.getByText(/no clients yet/i))
      .toBeInTheDocument();
  });
});
