import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseQuery = jest.fn();
const mockUseQueryClient = jest.fn(() => ({
  invalidateQueries: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => mockUseQueryClient(),
}));

jest.mock("axios");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/workspace/calendar",
}));

jest.mock("@/lib/meetings", () => ({
  createInstantMeeting: jest.fn(),
}));

jest.mock("@/lib/date_utils", () => ({
  formatDateOnly: jest.fn(() => "2026-05-10"),
  formatTimeOnly: jest.fn(() => "10:00 AM"),
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
});
