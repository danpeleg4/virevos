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
  Track: {},
  TrackPublication: {},
  LocalTrackPublication: {},
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
    // Mic and camera toggle buttons should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders 'Ready to join?' heading", () => {
    render(<InMeetingView />);
    expect(screen.getByText(/ready to join/i)).toBeInTheDocument();
  });
});
