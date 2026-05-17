import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: vi.fn(),
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
}));

const mockDeleteMutate = vi.fn();
const mockMutationFactory = vi.fn((..._args: unknown[]) => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockMutationFactory(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock("axios");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/workspace/calendar",
}));

vi.mock("@/lib/workspace/meetings", () => ({
  createInstantMeeting: vi.fn(),
}));

vi.mock("@/lib/workspace/calendar", () => ({
  deleteEventFromCalendar: vi.fn(),
}));

vi.mock("@/lib/util/date_utils", () => ({
  formatDateOnly: vi.fn(() => "2026-05-10"),
  formatTimeOnly: vi.fn(() => "10:00 AM"),
}));

const mockMeetings = [
  {
    id: "m1",
    title: "Sprint Planning",
    description: "",
    status: "upcoming",
    dateTime: "2026-05-10T10:00:00Z",
    duration: 60,
    attendees: [],
    isMeeting: true,
  },
  {
    id: "m2",
    title: "Client Review",
    description: "",
    status: "ended",
    dateTime: "2026-05-01T14:00:00Z",
    duration: 60,
    attendees: [],
    isMeeting: true,
  },
];

import { Meetings } from "@/app/components/scheduling/Meetings";

describe("Meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMutate.mockReset();
    mockMutationFactory.mockImplementation(() => ({
      mutate: vi.fn(),
      isPending: false,
    }));
    mockUseQuery.mockReturnValue({
      data: mockMeetings,
      isLoading: false,
      error: null,
    });
  });

  it("renders the meetings table with data", () => {
    render(<Meetings />);
    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.getByText("Client Review")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<Meetings />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("filters meetings by search query", () => {
    render(<Meetings />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "sprint" },
    });
    expect(screen.getByText("Sprint Planning")).toBeInTheDocument();
    expect(screen.queryByText("Client Review")).not.toBeInTheDocument();
  });

  it("renders 'New Meeting' button", () => {
    render(<Meetings />);
    expect(
      screen.getByRole("button", { name: /new meeting/i })
    ).toBeInTheDocument();
  });

  it("opens Start Meeting modal when button is clicked", () => {
    render(<Meetings />);
    fireEvent.click(screen.getByRole("button", { name: /new meeting/i }));
    expect(screen.getByText(/start new meeting/i)).toBeInTheDocument();
  });

  it("shows empty state when no meetings loaded", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<Meetings />);
    expect(screen.queryByText("Sprint Planning")).not.toBeInTheDocument();
  });

  it("shows loading state while fetching", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<Meetings />);
    // Still renders the layout
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("renders a delete button for each meeting row", () => {
    render(<Meetings />);
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete meeting/i,
    });
    expect(deleteButtons.length).toBe(mockMeetings.length);
  });

  it("opens the delete confirmation dialog when the delete button is clicked", () => {
    render(<Meetings />);
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete meeting/i,
    });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText(/delete meeting\?/i)).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/"sprint planning"/i)).toBeInTheDocument();
  });

  it("calls deleteMeeting.mutate with the meeting id when the user confirms", () => {
    // Track the mutate function passed to the delete mutation specifically.
    // The component calls useMutation three times: createMeeting, deleteMeeting,
    // and (in CalendarView pattern only) no others — so deleteMeeting is the
    // 2nd useMutation call.
    const mutateFns: Mock[] = [];
    mockMutationFactory.mockImplementation(() => {
      const mutate = vi.fn();
      mutateFns.push(mutate);
      return { mutate, isPending: false };
    });

    render(<Meetings />);
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete meeting/i,
    });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const calledMutates = mutateFns.filter((m) => m.mock.calls.length > 0);
    expect(calledMutates).toHaveLength(1);
    expect(calledMutates[0]).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
