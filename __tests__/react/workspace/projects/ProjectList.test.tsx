import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/lib/task_percentage", () => ({
  task_percentage: jest.fn(() => 60),
}));

jest.mock("@/lib/projects", () => ({
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

const mockProjects = [
  { id: 1, clientId: null, name: "Alpha Project", status: "active", clientName: "Acme", dueDate: "2026-06-01", stats: { totalTasks: 5, completedTasks: 3, percentage: 60 }, priority: "high" },
  { id: 2, clientId: null, name: "Beta Project", status: "completed", clientName: "Beta", dueDate: "2026-05-01", stats: { totalTasks: 4, completedTasks: 4, percentage: 100 }, priority: "medium" },
];

const mockClients = [
  { id: 1, name: "Acme Corp", email: "a@a.com", phone: "", industry: undefined, status: "active", activeProjects: 1, completedProjects: 0, totalProjects: 1, avatar: "A" },
];

import { ProjectList } from "@/app/workspace/projects/ProjectList";

describe("ProjectList", () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  it("renders project names", () => {
    render(
      <ProjectList
        projects={mockProjects}
        clients={mockClients}
        onSelect={onSelect}
      />
    );
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(
      <ProjectList
        projects={mockProjects}
        clients={mockClients}
        onSelect={onSelect}
      />
    );
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
  });

  it("calls onSelect when a project row is clicked", () => {
    render(
      <ProjectList
        projects={mockProjects}
        clients={mockClients}
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Alpha Project"));
    expect(onSelect).toHaveBeenCalledWith(mockProjects[0]);
  });

  it("renders 'New Project' button", () => {
    render(
      <ProjectList
        projects={mockProjects}
        clients={mockClients}
        onSelect={onSelect}
      />
    );
    expect(screen.getByRole("button", { name: /new project/i })).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(
      <ProjectList
        projects={mockProjects}
        clients={mockClients}
        onSelect={onSelect}
      />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
