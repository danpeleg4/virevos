import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
}));

import AddNewTask from "@/app/components/AddNewTask";

describe("AddNewTask", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  it("renders 'New Task' button", () => {
    render(<AddNewTask />);
    expect(
      screen.getByRole("button", { name: /new task/i })
    ).toBeInTheDocument();
  });

  it("opens dialog when 'New Task' is clicked", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByText("Create New Task")).toBeInTheDocument();
  });

  it("renders title input inside dialog", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByPlaceholderText(/review designs/i)).toBeInTheDocument();
  });

  it("renders description textarea inside dialog", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(
      screen.getByPlaceholderText(/add more details/i)
    ).toBeInTheDocument();
  });

  it("shows case select when no caseId prop", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByText(/select a case/i)).toBeInTheDocument();
  });

  it("hides case select when caseId prop is provided", () => {
    render(<AddNewTask caseId={5} />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.queryByText(/select a case/i)).not.toBeInTheDocument();
  });

  it("'Create Task' button is disabled when title is empty", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    expect(screen.getByRole("button", { name: /create task/i })).toBeDisabled();
  });

  it("enables 'Create Task' when title is filled", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    fireEvent.change(screen.getByPlaceholderText(/review designs/i), {
      target: { value: "My task" },
    });
    expect(
      screen.getByRole("button", { name: /create task/i })
    ).not.toBeDisabled();
  });

  it("calls mutation and closes dialog on submit", async () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    fireEvent.change(screen.getByPlaceholderText(/review designs/i), {
      target: { value: "Test Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Task", status: "in-progress" })
    );
    await waitFor(() => {
      expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
    });
  });

  it("closes dialog and resets form when Cancel is clicked", () => {
    render(<AddNewTask />);
    fireEvent.click(screen.getByRole("button", { name: /new task/i }));
    fireEvent.change(screen.getByPlaceholderText(/review designs/i), {
      target: { value: "something" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
  });
});
