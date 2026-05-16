import React from "react";
import { render, screen } from "@testing-library/react";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/tasks", () => ({
  updateTaskStatus: vi.fn(),
}));
vi.mock("@/lib/task_percentage", () => ({
  task_percentage: vi.fn(() => 50),
}));

const mockProjects = [
  {
    id: 1,
    clientId: null,
    name: "Alpha Project",
    status: "active",
    clientName: "TechCorp",
    dueDate: "2026-06-01",
    priority: "medium",
    stats: { totalTasks: 4, completedTasks: 2, percentage: 50 },
  },
  {
    id: 2,
    clientId: null,
    name: "Beta Project",
    status: "active",
    clientName: "StartupXYZ",
    dueDate: "2026-07-01",
    priority: "low",
    stats: { totalTasks: 2, completedTasks: 2, percentage: 100 },
  },
];

const mockTasks = [
  {
    id: 1,
    title: "Fix login bug",
    status: "todo",
    priority: "high",
    dueDate: null,
    projectName: "Alpha Project",
    completed: false,
  },
  {
    id: 2,
    title: "Update docs",
    status: "in-progress",
    priority: "medium",
    dueDate: "2026-05-20",
    projectName: "Beta Project",
    completed: false,
  },
];

import Dashboard from "@/app/workspace/dashboard/page";

describe("Dashboard Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "clients")
        return { data: [{ id: 1 }, { id: 2 }], isLoading: false };
      if (queryKey[0] === "cases")
        return { data: { cases: mockProjects }, isLoading: false };
      if (queryKey[0] === "allTasks")
        return { data: mockTasks, isLoading: false };
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
    expect(screen.getByText("Active Cases")).toBeInTheDocument();
    expect(screen.getByText("Tasks Completed")).toBeInTheDocument();
    expect(screen.getByText("Automations Run")).toBeInTheDocument();
  });

  it("renders Recent Cases section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Recent Cases")).toBeInTheDocument();
  });

  it("renders Upcoming Tasks section", () => {
    render(<Dashboard />);
    expect(screen.getByText("Upcoming Tasks")).toBeInTheDocument();
  });

  it("renders cases from query", () => {
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
