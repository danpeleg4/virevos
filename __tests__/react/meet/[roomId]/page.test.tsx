import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ roomId: "test-room-123" }),
}));

vi.mock("axios");

vi.mock("livekit-client", () => ({
  Room: vi.fn(function () {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      localParticipant: { publishTrack: vi.fn() },
      on: vi.fn(),
      off: vi.fn(),
    };
  }),
  createLocalTracks: vi.fn(() => Promise.resolve([])),
  RoomEvent: {},
  ParticipantEvent: {},
  ParticipantKind: {},
  Track: {},
  TrackPublication: {},
  LocalTrackPublication: {},
}));

// Prevent Clerk ESM import chain from failing in Jest
vi.mock("@/lib/meetings", () => ({
  startMeeting: vi.fn(),
}));

// Mock TanStack Query — return a resolved active meeting so the name-input renders
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(() => ({
    data: {
      meeting: {
        status: "active",
        dateTime: new Date().toISOString(),
        title: "Test Meeting",
      },
      isHost: true,
    },
    isLoading: false,
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

import InMeetingView from "@/app/meet/[roomId]/page";

describe("InMeetingView Page", () => {
  it("renders name input before joining", () => {
    render(<InMeetingView />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders 'Join' button", () => {
    render(<InMeetingView />);
    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
  });

  it("renders audio/video controls in pre-join UI", () => {
    render(<InMeetingView />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders 'Ready to join?' heading", () => {
    render(<InMeetingView />);
    expect(screen.getByText(/ready to join/i)).toBeInTheDocument();
  });

  it("renders loading state when meeting info is loading", () => {
    mockUseQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
    });
    const { container } = render(<InMeetingView />);
    // Loading spinner is a div, not a heading/button
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders pre-meeting screen for upcoming meetings", () => {
    mockUseQuery.mockReturnValueOnce({
      data: {
        meeting: {
          status: "upcoming",
          dateTime: new Date().toISOString(),
          title: "Team Sync",
        },
        isHost: true,
      },
      isLoading: false,
    });
    render(<InMeetingView />);
    expect(screen.getByText(/start meeting now/i)).toBeInTheDocument();
    expect(screen.getByText(/scheduled for/i)).toBeInTheDocument();
  });
});
