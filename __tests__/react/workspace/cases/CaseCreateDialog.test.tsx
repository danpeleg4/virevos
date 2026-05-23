import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/workspace/cases", () => ({
  createCase: vi.fn(),
}));

const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (msg: string) => mockToastError(msg) },
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
    mockToastError.mockClear();
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

  it("disables the Create Case button and shows a message when name is empty", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    expect(screen.getByRole("button", { name: /create case/i })).toBeDisabled();
    expect(screen.getByText(/case name is required/i)).toBeInTheDocument();
  });

  it("enables the Create Case button once a name is entered", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    const nameInput = screen.getByPlaceholderText(/website redesign/i);
    fireEvent.change(nameInput, { target: { value: "New Campaign" } });
    expect(screen.getByRole("button", { name: /create case/i })).toBeEnabled();
    expect(
      screen.queryByText(/case name is required/i)
    ).not.toBeInTheDocument();
  });

  it("does not mutate when name is only whitespace", () => {
    render(<CaseCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    const nameInput = screen.getByPlaceholderText(/website redesign/i);
    fireEvent.change(nameInput, { target: { value: "New Campaign" } });
    fireEvent.change(nameInput, { target: { value: "   " } });
    // The disabled button blocks submission; the inline message explains why.
    expect(screen.getByRole("button", { name: /create case/i })).toBeDisabled();
    expect(screen.getByText(/case name is required/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create case/i }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
