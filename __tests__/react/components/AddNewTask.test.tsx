import React from "react";
import { render } from "vitest-browser-react";

const mockMutate = vi.fn();
const mockUseQuery = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(() => []),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock("axios");
vi.mock("@/lib/workspace/tasks", () => ({
  addCaseTasksAction: vi.fn(),
  addProjectTasksAction: vi.fn(),
}));

import AddNewTask from "@/app/components/AddNewTask";

describe("AddNewTask", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it("renders 'New Task' button", async () => {
    const screen = await render(<AddNewTask />);
    await expect
      .element(screen.getByRole("button", { name: /new task/i }))
      .toBeInTheDocument();
  });

  it("opens dialog when 'New Task' is clicked", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders title input inside dialog", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByPlaceholder(/review designs/i))
      .toBeInTheDocument();
  });

  it("renders description textarea inside dialog", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByPlaceholder(/add more details/i))
      .toBeInTheDocument();
  });

  it("shows case select when no caseId prop", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText(/select a case/i))
      .toBeInTheDocument();
  });

  it("hides case select when caseId prop is provided", async () => {
    const screen = await render(<AddNewTask caseId={5} />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByText(/select a case/i))
      .not.toBeInTheDocument();
  });

  it("'Create Task' button is disabled when title is empty", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await expect
      .element(screen.getByRole("button", { name: /create task/i }))
      .toBeDisabled();
  });

  it("enables 'Create Task' when title is filled", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("My task");
    await expect
      .element(screen.getByRole("button", { name: /create task/i }))
      .not.toBeDisabled();
  });

  it("calls mutation and closes dialog on submit", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("Test Task");
    await screen.getByRole("button", { name: /create task/i }).click();
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Task", status: "in-progress" })
    );
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("closes dialog and resets form when Cancel is clicked", async () => {
    const screen = await render(<AddNewTask />);
    await screen.getByRole("button", { name: /new task/i }).click();
    await screen.getByPlaceholder(/review designs/i).fill("something");
    await screen.getByRole("button", { name: /cancel/i }).click();
    await expect
      .element(screen.getByText("Create New Task", { exact: true }))
      .not.toBeInTheDocument();
  });
});
