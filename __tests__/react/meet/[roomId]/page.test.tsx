import React from "react";
import { page } from "vitest/browser";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ roomId: "test-room-123" }),
}));

vi.mock("livekit-client", () => ({
  Room: vi.fn(function () {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      localParticipant: {
        sid: "local-sid",
        identity: "Tester",
        isLocal: true,
        isMicrophoneEnabled: true,
        videoTrackPublications: new Map(),
        audioTrackPublications: new Map(),
        publishTrack: vi.fn(),
        setCameraEnabled: vi.fn(),
        setMicrophoneEnabled: vi.fn(),
        setScreenShareEnabled: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        removeListener: vi.fn(),
      },
      remoteParticipants: new Map(),
      on: vi.fn(),
      off: vi.fn(),
    };
  }),
  createLocalTracks: vi.fn(() => Promise.resolve([])),
  RoomEvent: {},
  ParticipantEvent: {},
  ParticipantKind: { AGENT: "agent" },
  Track: { Source: { ScreenShare: "screen_share" } },
  TrackPublication: {},
  LocalTrackPublication: {},
}));

Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
  },
});

import InMeetingView from "@/app/meet/[roomId]/page";

function useMeetingInfoHandler(
  meeting: {
    status: string;
    dateTime: string;
    title: string;
  },
  isHost = true
) {
  worker.use(
    http.get("/api/events/:id", () => HttpResponse.json({ meeting, isHost }))
  );
}

const activeMeeting = {
  status: "active",
  dateTime: new Date().toISOString(),
  title: "Test Meeting",
};

describe("InMeetingView Page", () => {
  beforeEach(() => {
    useMeetingInfoHandler(activeMeeting);
  });

  it("renders name input before joining", async () => {
    const screen = await renderWithQueryClient(<InMeetingView />);
    await expect.element(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders 'Join' button", async () => {
    const screen = await renderWithQueryClient(<InMeetingView />);
    await expect
      .element(screen.getByRole("button", { name: /join/i }))
      .toBeInTheDocument();
  });

  it("renders audio/video controls in pre-join UI", async () => {
    const screen = await renderWithQueryClient(<InMeetingView />);
    await expect
      .element(screen.getByRole("button").first())
      .toBeInTheDocument();
  });

  it("renders 'Ready to join?' heading", async () => {
    const screen = await renderWithQueryClient(<InMeetingView />);
    await expect
      .element(screen.getByText(/ready to join/i))
      .toBeInTheDocument();
  });

  it("renders loading state when meeting info is loading", async () => {
    worker.use(
      http.get("/api/events/:id", async () => {
        await new Promise(() => {}); // never resolves
        return HttpResponse.json({});
      })
    );
    const screen = await renderWithQueryClient(<InMeetingView />);
    // Loading spinner is a div, not a heading/button
    expect(screen.container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders pre-meeting screen for upcoming meetings", async () => {
    useMeetingInfoHandler({
      status: "upcoming",
      dateTime: new Date().toISOString(),
      title: "Team Sync",
    });
    const screen = await renderWithQueryClient(<InMeetingView />);
    await expect
      .element(screen.getByText(/start meeting now/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/scheduled for/i))
      .toBeInTheDocument();
  });

  describe("leave behavior", () => {
    const completeJoinAndLeave = async () => {
      worker.use(
        http.post("/api/token", () =>
          HttpResponse.json({
            token: "t",
            meetingTitle: "Test",
            url: "wss://x",
          })
        )
      );

      const screen = await renderWithQueryClient(<InMeetingView />);
      await screen.getByRole("textbox").fill("Tester");
      await screen.getByRole("button", { name: /join meeting/i }).click();

      // Wait for joined-state control bar (4 buttons: mute, camera, screen, leave-X)
      const xButton = await vi.waitFor(() => {
        const buttons = screen.getByRole("button").elements();
        if (buttons.length < 4) throw new Error("join not complete");
        return buttons[buttons.length - 1];
      });
      await page.elementLocator(xButton).click();

      await screen.getByRole("button", { name: /leave meeting/i }).click();
    };

    it("redirects host to /workspace/dashboard on leave", async () => {
      useMeetingInfoHandler(activeMeeting, true);

      await completeJoinAndLeave();

      expect(pushMock).toHaveBeenCalledWith("/workspace/dashboard");
      expect(pushMock).not.toHaveBeenCalledWith("/");
    });

    it("redirects non-host to / on leave", async () => {
      useMeetingInfoHandler(activeMeeting, false);

      await completeJoinAndLeave();

      expect(pushMock).toHaveBeenCalledWith("/");
      expect(pushMock).not.toHaveBeenCalledWith("/workspace/dashboard");
    });
  });
});
