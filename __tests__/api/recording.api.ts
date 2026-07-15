import { GET } from "@/app/api/recording/[id]/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getRecordingUrl } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/meetings_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/meetings", () => ({
  getRecordingUrl: vi.fn(),
}));

vi.mock("@db/meetings_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  meetingsDrizzle: { __sentinel: "meetingsDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/recording/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(401);
    expect(getRecordingUrl).not.toHaveBeenCalled();
  });

  it("returns 400 if id is empty", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 when the meeting is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getRecordingUrl as Mock).mockResolvedValueOnce(null);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns 404 when the storage lookup fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getRecordingUrl as Mock).mockRejectedValueOnce(new Error("storage error"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns the signed url from the wired deps", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getRecordingUrl as Mock).mockResolvedValueOnce({
      url: "https://signed-url",
    });

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://signed-url");
    expect(getRecordingUrl).toHaveBeenCalledWith(
      "meeting_1",
      meetingsDrizzle,
      supabaseStorageClient
    );
  });
});
