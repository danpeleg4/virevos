import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/lib/cases", () => ({
  createCase: jest.fn(),
}));

const mockClients = [
  {
    id: 1,
    name: "Acme Corp",
    email: "a@a.com",
    phone: "",
    status: "active",
    activeCases: 1,
    completedCases: 0,
    totalCases: 1,
    avatar: "A",
  },
];

import { CaseCreateDialog } from "@/app/workspace/cases/CaseCreateDialog";

describe("CaseCreateDialog", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("renders 'New Case' trigger button", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    expect(
      screen.getByRole("button", { name: /new case/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when button is clicked", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    expect(screen.getByText("Create New Case")).toBeInTheDocument();
  });

  it("renders case name input in dialog", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    expect(screen.getByText("Case Name")).toBeInTheDocument();
  });

  it("calls mutation on form submit", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    const nameInput = screen.getByPlaceholderText(/website redesign/i);
    fireEvent.change(nameInput, { target: { value: "New Campaign" } });
    fireEvent.click(screen.getByRole("button", { name: /create case/i }));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Campaign", status: "active" })
    );
  });
});
