import React from "react";
import { render } from "vitest-browser-react";

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

  it("renders the meetings table with data", async () => {
    const screen = await render(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Client Review")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await render(<Meetings />);
    await expect
      .element(screen.getByPlaceholder(/search/i))
      .toBeInTheDocument();
  });

  it("filters meetings by search query", async () => {
    const screen = await render(<Meetings />);
    await screen.getByPlaceholder(/search/i).fill("sprint");
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Client Review"))
      .not.toBeInTheDocument();
  });

  it("renders 'New Meeting' button", async () => {
    const screen = await render(<Meetings />);
    await expect
      .element(screen.getByRole("button", { name: /new meeting/i }))
      .toBeInTheDocument();
  });

  it("opens Start Meeting modal when button is clicked", async () => {
    const screen = await render(<Meetings />);
    await screen.getByRole("button", { name: /new meeting/i }).click();
    await expect
      .element(screen.getByText(/start new meeting/i))
      .toBeInTheDocument();
  });

  it("shows empty state when no meetings loaded", async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    const screen = await render(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .not.toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    const screen = await render(<Meetings />);
    // Still renders the layout
    await expect
      .element(screen.getByPlaceholder(/search/i))
      .toBeInTheDocument();
  });

  it("renders a delete button for each meeting row", async () => {
    const screen = await render(<Meetings />);
    const deleteButtons = screen.getByRole("button", {
      name: /delete meeting/i,
    });
    await expect.element(deleteButtons.first()).toBeInTheDocument();
    expect(deleteButtons.elements().length).toBe(mockMeetings.length);
  });

  it("opens the delete confirmation dialog when the delete button is clicked", async () => {
    const screen = await render(<Meetings />);
    await screen
      .getByRole("button", { name: /delete meeting/i })
      .first()
      .click();
    await expect
      .element(screen.getByText(/delete meeting\?/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/permanently deleted/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/"sprint planning"/i))
      .toBeInTheDocument();
  });

  it("calls deleteMeeting.mutate with the meeting id when the user confirms", async () => {
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

    const screen = await render(<Meetings />);
    await screen
      .getByRole("button", { name: /delete meeting/i })
      .first()
      .click();
    await screen.getByRole("button", { name: /^delete$/i }).click();

    const calledMutates = mutateFns.filter((m) => m.mock.calls.length > 0);
    expect(calledMutates).toHaveLength(1);
    expect(calledMutates[0]).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
