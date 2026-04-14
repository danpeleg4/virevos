import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/lib/projects", () => ({
  createProject: jest.fn(),
}));

const mockClients = [
  {
    id: 1,
    name: "Acme Corp",
    email: "a@a.com",
    phone: "",
    industry: "",
    status: "active",
    activeProjects: 1,
    completedProjects: 0,
    totalProjects: 1,
    avatar: "A",
  },
];

import { ProjectCreateDialog } from "@/app/workspace/projects/ProjectCreateDialog";

describe("ProjectCreateDialog", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("renders 'New Project' trigger button", () => {
    render(<ProjectCreateDialog clients={mockClients} />);
    expect(
      screen.getByRole("button", { name: /new project/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when button is clicked", () => {
    render(<ProjectCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(screen.getByText("Create New Project")).toBeInTheDocument();
  });

  it("renders project name input in dialog", () => {
    render(<ProjectCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(screen.getByText("Project Name")).toBeInTheDocument();
  });

  it("calls mutation on form submit", () => {
    render(<ProjectCreateDialog clients={mockClients} />);
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    const nameInput = screen.getByPlaceholderText(/website redesign/i);
    fireEvent.change(nameInput, { target: { value: "New Campaign" } });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Campaign", status: "active" })
    );
  });
});
