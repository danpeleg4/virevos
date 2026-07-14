import React, { Suspense } from "react";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock("axios");

vi.mock("@/lib/workspace/cases", () => ({
  addFileMetadata: vi.fn(),
  addCaseNotes: vi.fn(),
  deleteCase: vi.fn(),
  deleteCaseFile: vi.fn(),
}));

vi.mock("@/lib/workspace/tasks", () => ({
  updateTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
  addProjectTasksAction: vi.fn(),
  changePriorityStatus: vi.fn(),
  updateTaskDueDate: vi.fn(),
}));

vi.mock("@/lib/util/task_percentage", () => ({
  task_percentage: vi.fn(() => 50),
}));

const mockProject = {
  id: 1,
  name: "Alpha Case",
  status: "active",
  dueDate: "2026-06-01",
  priority: "high",
  clientId: null,
  clientName: "Acme Corp",
  stats: { totalTasks: 4, completedTasks: 2, percentage: 50 },
};

const mockTasks = [
  {
    id: 1,
    title: "Design mockup",
    status: "todo",
    priority: "high",
    completed: false,
    dueDate: null,
  },
  {
    id: 2,
    title: "Write tests",
    status: "completed",
    priority: "medium",
    completed: true,
    dueDate: null,
  },
];

import CasePage from "@/app/workspace/cases/[id]/page";

const renderPage = () =>
  render(
    <Suspense fallback={<div>Loading...</div>}>
      <CasePage params={Promise.resolve({ id: "1" })} />
    </Suspense>
  );

describe("Case Detail Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "case")
        return { data: mockProject, isLoading: false, isError: false };
      if (queryKey[0] === "caseTasks")
        return { data: mockTasks, isLoading: false, isError: false };
      if (queryKey[0] === "caseNotes")
        return { data: [], isLoading: false, isError: false };
      if (queryKey[0] === "files")
        return { data: [], isLoading: false, isError: false };
      return { data: undefined, isLoading: false, isError: false };
    });
  });

  it("renders case name", async () => {
    const screen = await renderPage();
    await expect.element(screen.getByText("Alpha Case")).toBeInTheDocument();
  });

  it("renders task list", async () => {
    const screen = await renderPage();
    await expect.element(screen.getByText("Design mockup")).toBeInTheDocument();
    await expect.element(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("renders Files section", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByText(/files/i).first())
      .toBeInTheDocument();
  });

  it("renders Notes section", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByText(/notes/i).first())
      .toBeInTheDocument();
  });

  it("renders client name", async () => {
    const screen = await renderPage();
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders Add Task button", async () => {
    const screen = await renderPage();
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });
});
