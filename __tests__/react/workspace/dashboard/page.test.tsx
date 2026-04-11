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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("motion/react", () => {
  const R = require("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        function MC({ children, initial, animate, exit, variants, transition, viewport, whileInView, ...props }: Record<string, unknown>) {
          return R.createElement(tag, props, children);
        },
    }
  );
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/lib/tasks", () => ({
  updateTaskStatus: jest.fn(),
}));
jest.mock("@/lib/task_percentage", () => ({
  task_percentage: jest.fn(() => 50),
}));

const mockProjects = [
  { id: 1, name: "Alpha Project", status: "active", clientName: "TechCorp", dueDate: "2026-06-01", stats: { totalTasks: 4, completedTasks: 2 } },
  { id: 2, name: "Beta Project", status: "active", clientName: "StartupXYZ", dueDate: "2026-07-01", stats: { totalTasks: 2, completedTasks: 2 } },
];

const mockTasks = [
  { id: 1, title: "Fix login bug", status: "todo", priority: "high", dueDate: null, projectName: "Alpha Project", completed: false },
  { id: 2, title: "Update docs", status: "in-progress", priority: "medium", dueDate: "2026-05-20", projectName: "Beta Project", completed: false },
];

import Dashboard from "@/app/workspace/dashboard/page";

describe("Dashboard Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "clients") return { data: [{ id: 1 }, { id: 2 }], isLoading: false };
      if (queryKey[0] === "projects") return { data: { projects: mockProjects }, isLoading: false };
      if (queryKey[0] === "allTasks") return { data: mockTasks, isLoading: false };
      return { data: undefined, isLoading: false };
    });
  });

  it("renders Dashboard heading", () => {
    render(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<Dashboard />);
    expect(screen.getByText("Active Clients")).toBeInTheDocument();
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
    expect(screen.getByText("Tasks Completed")).toBeInTheDocument();
    expect(screen.getByText("Automations Run")).toBeInTheDocument();
  });

  it("renders Recent Projects section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Recent Projects")).toBeInTheDocument();
  });

  it("renders Upcoming Tasks section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Upcoming Tasks")).toBeInTheDocument();
  });

  it("renders projects from query", () => {
    render(<Dashboard />);
    expect(screen.getAllByText("Alpha Project").length).toBeGreaterThan(0);
  });

  it("renders tasks from query", () => {
    render(<Dashboard />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("shows client count", () => {
    render(<Dashboard />);
    // 2 clients in mock data - may appear in multiple stat cards
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });
});
