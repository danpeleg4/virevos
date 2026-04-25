import React, { Suspense } from "react";
import { render, screen, act } from "@testing-library/react";

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
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("axios");

jest.mock("@/lib/cases", () => ({
  addFileMetadata: jest.fn(),
  addCaseNotes: jest.fn(),
  deleteCase: jest.fn(),
  deleteCaseFile: jest.fn(),
}));

jest.mock("@/lib/tasks", () => ({
  updateTaskStatus: jest.fn(),
  deleteTask: jest.fn(),
  addProjectTasksAction: jest.fn(),
}));

jest.mock("@/lib/task_percentage", () => ({
  task_percentage: jest.fn(() => 50),
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

const renderPage = async () => {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <CasePage params={Promise.resolve({ id: "1" })} />
      </Suspense>
    );
  });
};

describe("Case Detail Page", () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
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
    await renderPage();
    expect(screen.getByText("Alpha Case")).toBeInTheDocument();
  });

  it("renders task list", async () => {
    await renderPage();
    expect(screen.getByText("Design mockup")).toBeInTheDocument();
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("renders Files section", async () => {
    await renderPage();
    expect(screen.getAllByText(/files/i).length).toBeGreaterThan(0);
  });

  it("renders Notes section", async () => {
    await renderPage();
    expect(screen.getAllByText(/notes/i).length).toBeGreaterThan(0);
  });

  it("renders client name", async () => {
    await renderPage();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders Add Task button", async () => {
    await renderPage();
    expect(
      screen.getByRole("button", { name: /new task/i })
    ).toBeInTheDocument();
  });
});
