import { GET } from "@/app/api/transcript/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { NextRequest } from "next/server";
import { getTranscript } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  getTranscript: vi.fn(),
}));

vi.mock("@db/classes/meetings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/transcript/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
    expect(getTranscript).not.toHaveBeenCalled();
  });

  it("returns 400 if id is empty", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 when the lib fn returns null", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getTranscript as Mock).mockResolvedValueOnce(null);

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
  });

  it("returns 404 when there are no transcript chunks", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getTranscript as Mock).mockResolvedValueOnce({
      chunks: [],
      meetingStartTimeEpoch: null,
    });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No transcript found" });
  });

  it("returns parsed chunks from the wired db", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const chunks = [
      { speaker: "Alice", text: "Hello", createdAt: new Date("2026-01-01") },
      { speaker: "Bob", text: "Hi", createdAt: new Date("2026-01-01") },
    ];
    (getTranscript as Mock).mockResolvedValueOnce({
      chunks,
      meetingStartTimeEpoch: 1700000000,
    });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meetingStartTimeEpoch).toBe(1700000000);
    expect(json.chunks).toHaveLength(2);
    expect(json.chunks[0].speaker).toBe("Alice");
    expect(getTranscript).toHaveBeenCalledWith("abc123_xyz", meetingsDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getTranscript as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(500);
  });
});
