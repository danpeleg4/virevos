import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ roomId: "test-room-123" }),
}));

jest.mock("axios");

jest.mock("livekit-client", () => ({
  Room: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    localParticipant: { publishTrack: jest.fn() },
    on: jest.fn(),
    off: jest.fn(),
  })),
  createLocalTracks: jest.fn(() => Promise.resolve([])),
  RoomEvent: {},
  ParticipantEvent: {},
  ParticipantKind: {},
  Track: {},
  TrackPublication: {},
  LocalTrackPublication: {},
}));

// Prevent Clerk ESM import chain from failing in Jest
jest.mock("@/lib/meetings", () => ({
  startMeeting: jest.fn(),
}));

// Mock TanStack Query — return a resolved active meeting so the name-input renders
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({
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
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
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
    const { useQuery } = require("@tanstack/react-query");
    (useQuery as jest.Mock).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
    });
    const { container } = render(<InMeetingView />);
    // Loading spinner is a div, not a heading/button
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders pre-meeting screen for upcoming meetings", () => {
    const { useQuery } = require("@tanstack/react-query");
    (useQuery as jest.Mock).mockReturnValueOnce({
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
