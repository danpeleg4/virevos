import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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
vi.mock("@/lib/workspace/tasks", () => ({
  updateTaskStatus: vi.fn(),
  addProjectTasksAction: vi.fn(),
}));
vi.mock("@/lib/util/date_utils", () => ({
  parseDateOnlyString: vi.fn((s: string) => new Date(s)),
}));

const mockTasks = [
  {
    id: 1,
    title: "Design UI mockups",
    status: "in-progress",
    priority: "high",
    dueDate: "2026-05-01",
    projectName: "Alpha",
    completed: false,
  },
  {
    id: 2,
    title: "Write unit tests",
    status: "in-progress",
    priority: "medium",
    dueDate: "2026-05-10",
    projectName: "Beta",
    completed: false,
  },
  {
    id: 3,
    title: "Deploy to staging",
    status: "completed",
    priority: "low",
    dueDate: null,
    projectName: "Alpha",
    completed: true,
  },
];

import Tasks from "@/app/workspace/tasks/page";

describe("Tasks Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });
  });

  it("renders tasks table with task titles", () => {
    render(<Tasks />);
    expect(screen.getByText("Design UI mockups")).toBeInTheDocument();
    expect(screen.getByText("Write unit tests")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<Tasks />);
    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
  });

  it("renders status filter tabs", () => {
    render(<Tasks />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /in progress/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /completed/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /to do/i })
    ).not.toBeInTheDocument();
  });

  it("renders 'New Task' button", () => {
    render(<Tasks />);
    expect(
      screen.getByRole("button", { name: /new task/i })
    ).toBeInTheDocument();
  });

  it("filters tasks by search query", () => {
    render(<Tasks />);
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), {
      target: { value: "design" },
    });
    expect(screen.getByText("Design UI mockups")).toBeInTheDocument();
    expect(screen.queryByText("Write unit tests")).not.toBeInTheDocument();
  });

  it("filters by status tab - 'In Progress' shows only in-progress tasks", () => {
    render(<Tasks />);
    fireEvent.click(screen.getByRole("button", { name: /in progress/i }));
    expect(screen.getByText("Design UI mockups")).toBeInTheDocument();
    expect(screen.queryByText("Deploy to staging")).not.toBeInTheDocument();
  });

  it("renders priority badges", () => {
    render(<Tasks />);
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("renders pagination controls", () => {
    render(<Tasks />);
    expect(
      screen.getByRole("button", { name: /previous/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("shows 'No tasks found' when no tasks match filter", () => {
    render(<Tasks />);
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), {
      target: { value: "xyznonexistent" },
    });
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
  });
});
