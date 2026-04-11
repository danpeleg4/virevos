import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockMutate = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/lib/projects", () => ({
  updateProject: jest.fn(),
}));

const mockProject = {
  id: 1,
  name: "Existing Project",
  status: "active",
  priority: "medium",
  clientId: 1,
  dueDate: "2026-06-01",
  stats: { totalTasks: 3, completedTasks: 1, percentage: 33 },
};

const mockClients = [
  { id: 1, name: "Acme Corp", email: "a@a.com", status: "active", activeProjects: 1, completedProjects: 0, totalProjects: 1, avatar: "A" },
];

import { ProjectEditDialog } from "@/app/workspace/projects/ProjectEditDialog";

describe("ProjectEditDialog", () => {
  const onOpenChange = jest.fn();

  beforeEach(() => {
    mockMutate.mockClear();
    onOpenChange.mockClear();
  });

  it("renders dialog when open=true", () => {
    render(
      <ProjectEditDialog
        project={mockProject}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByText("Edit Project")).toBeInTheDocument();
  });

  it("does not render content when open=false", () => {
    render(
      <ProjectEditDialog
        project={mockProject}
        clients={mockClients}
        open={false}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.queryByText("Edit Project")).not.toBeInTheDocument();
  });

  it("pre-fills the project name", () => {
    render(
      <ProjectEditDialog
        project={mockProject}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByDisplayValue("Existing Project")).toBeInTheDocument();
  });

  it("renders Save Changes button", () => {
    render(
      <ProjectEditDialog
        project={mockProject}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("calls mutation on save", () => {
    render(
      <ProjectEditDialog
        project={mockProject}
        clients={mockClients}
        open={true}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
