import { POST } from "@/app/api/token/route";
import { NextRequest } from "next/server";
import { createMeetingToken } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
import { liveKitClient } from "@/api_client/livekit_client";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  createMeetingToken: vi.fn(),
}));

vi.mock("@db/meetings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

vi.mock("@/api_client/livekit_client", () => ({
  // sentinel — the route must pass this exact client into the lib fn
  liveKitClient: { __sentinel: "liveKitClient" },
}));

function req(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /token", () => {
  it("400 missing meetingId", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(createMeetingToken).not.toHaveBeenCalled();
  });

  it("404 invalid meeting", async () => {
    (createMeetingToken as Mock).mockResolvedValueOnce({
      outcome: "not-found",
    });

    await expect(POST(req({ meetingId: "1", name: "Dan" }))).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  it("403 meeting not started", async () => {
    (createMeetingToken as Mock).mockResolvedValueOnce({
      outcome: "not-started",
    });

    const res = await POST(req({ meetingId: "1", name: "Dan" }));
    expect(res.status).toBe(403);
  });

  it("410 meeting ended", async () => {
    (createMeetingToken as Mock).mockResolvedValueOnce({ outcome: "ended" });

    const res = await POST(req({ meetingId: "1", name: "Dan" }));
    expect(res.status).toBe(410);
  });

  it("200 returns token and meeting data from the wired deps", async () => {
    (createMeetingToken as Mock).mockResolvedValueOnce({
      outcome: "ok",
      token: "jwt-token",
      meetingTitle: "Daily Sync",
      url: "wss://livekit.test",
    });

    const res = await POST(req({ meetingId: "1", name: "Dan" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      token: "jwt-token",
      meetingTitle: "Daily Sync",
      url: "wss://livekit.test",
    });
    expect(createMeetingToken).toHaveBeenCalledWith(
      "1",
      "Dan",
      meetingsDrizzle,
      liveKitClient
    );
  });
});
