import React from "react";
import { render } from "vitest-browser-react";

const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/lib/workspace/cases", () => ({
  createCase: vi.fn(),
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

  it("renders 'New Case' trigger button", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await expect
      .element(screen.getByRole("button", { name: /new case/i }))
      .toBeInTheDocument();
  });

  it("opens dialog when button is clicked", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Create New Case", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders case name input in dialog", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByText("Case Name", { exact: true }))
      .toBeInTheDocument();
  });

  it("calls mutation on form submit", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByPlaceholder(/website redesign/i).fill("New Campaign");
    await screen.getByRole("button", { name: /create case/i }).click();
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Campaign", status: "active" })
    );
  });

  it("disables the Create Case button and shows a message when name is empty", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeDisabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .toBeInTheDocument();
  });

  it("enables the Create Case button once a name is entered", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    await screen.getByPlaceholder(/website redesign/i).fill("New Campaign");
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeEnabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .not.toBeInTheDocument();
  });

  it("does not mutate when name is only whitespace", async () => {
    const screen = await render(<CaseCreateDialog clients={mockClients} />);
    await screen.getByRole("button", { name: /new case/i }).click();
    const nameInput = screen.getByPlaceholder(/website redesign/i);
    await nameInput.fill("New Campaign");
    await nameInput.fill("   ");
    // The disabled button blocks submission; the inline message explains why.
    await expect
      .element(screen.getByRole("button", { name: /create case/i }))
      .toBeDisabled();
    await expect
      .element(screen.getByText(/case name is required/i))
      .toBeInTheDocument();
    await screen
      .getByRole("button", { name: /create case/i })
      .click({ force: true });
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
