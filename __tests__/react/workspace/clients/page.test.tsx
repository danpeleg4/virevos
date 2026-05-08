import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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
jest.mock("@/lib/clients", () => ({
  addAClient: jest.fn(),
  deleteClient: jest.fn(),
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
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockClients,
      isLoading: false,
      error: null,
    });
  });

  it("renders clients table with client names", () => {
    render(<Clients />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta LLC")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<Clients />);
    expect(screen.getByPlaceholderText(/search clients/i)).toBeInTheDocument();
  });

  it("renders Add Client button", () => {
    render(<Clients />);
    expect(
      screen.getByRole("button", { name: /add client/i })
    ).toBeInTheDocument();
  });

  it("opens add client dialog when button is clicked", () => {
    render(<Clients />);
    fireEvent.click(screen.getByRole("button", { name: /add client/i }));
    expect(screen.getByText("Add New Client")).toBeInTheDocument();
  });

  it("renders client status badges", () => {
    render(<Clients />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("filters clients by search query", () => {
    render(<Clients />);
    fireEvent.change(screen.getByPlaceholderText(/search clients/i), {
      target: { value: "acme" },
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    render(<Clients />);
    expect(
      screen.getByRole("button", { name: /previous/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("shows empty state when no clients", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<Clients />);
    expect(screen.getByText(/no clients yet/i)).toBeInTheDocument();
  });
});
