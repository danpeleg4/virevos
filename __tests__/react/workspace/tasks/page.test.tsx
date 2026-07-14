import React from "react";
import { render } from "vitest-browser-react";

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
  changePriorityStatus: vi.fn(),
  deleteTask: vi.fn(),
  updateTaskDueDate: vi.fn(),
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

  it("renders tasks table with task titles", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Write unit tests"))
      .toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByPlaceholder(/search tasks/i))
      .toBeInTheDocument();
  });

  it("renders status filter tabs", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /all/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /in progress/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /completed/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /to do/i }))
      .not.toBeInTheDocument();
  });

  it("renders 'New Task' button", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });

  it("filters tasks by search query", async () => {
    const screen = await render(<Tasks />);
    await screen.getByPlaceholder(/search tasks/i).fill("design");
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Write unit tests"))
      .not.toBeInTheDocument();
  });

  it("filters by status tab - 'In Progress' shows only in-progress tasks", async () => {
    const screen = await render(<Tasks />);
    await screen.getByRole("button", { name: /in progress/i }).click();
    await expect
      .element(screen.getByText("Design UI mockups"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Deploy to staging"))
      .not.toBeInTheDocument();
  });

  it("renders priority badges", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByText("high", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("medium", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders pagination controls", async () => {
    const screen = await render(<Tasks />);
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeInTheDocument();
  });

  it("shows 'No tasks found' when no tasks match filter", async () => {
    const screen = await render(<Tasks />);
    await screen.getByPlaceholder(/search tasks/i).fill("xyznonexistent");
    await expect
      .element(screen.getByText(/no tasks found/i))
      .toBeInTheDocument();
  });
});
