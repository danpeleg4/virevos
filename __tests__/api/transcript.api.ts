import { GET } from "@/app/api/transcript/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

// eslint-disable-next-line no-var
var mockWhere: jest.Mock;

jest.mock("@db/db", () => {
  mockWhere = jest.fn();
  return {
    db: {
      select: () => ({ from: () => ({ where: mockWhere }) }),
    },
  };
});

jest.mock("@db/schema", () => ({ events: {} }));
jest.mock("drizzle-orm", () => ({ and: jest.fn(), eq: jest.fn() }));

const mockList = jest.fn();
const mockDownload = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: jest.fn(() => ({
        list: mockList,
        download: mockDownload,
      })),
    },
  },
  TRANSCRIPTS_BUCKET: "jsonFiles",
}));

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/transcript/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhere.mockResolvedValue([{ id: "abc123_xyz" }]);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 400 if id is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 if storage folder is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockList.mockResolvedValueOnce({ data: [], error: null });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No files found in folder" });
  });

  it("returns 404 if folder has no JSON files", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockList.mockResolvedValueOnce({
      data: [{ name: "audio.mp3" }],
      error: null,
    });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No JSON files found" });
  });

  it("returns 500 if storage throws an error", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockList.mockResolvedValueOnce({
      data: null,
      error: { message: "Storage unavailable" },
    });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
  });

  it("returns parsed JSON from all matching files", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const file1 = { speaker: "Alice", text: "Hello" };
    const file2 = { speaker: "Bob", text: "Hi" };

    mockList.mockResolvedValueOnce({
      data: [{ name: "chunk1.json" }, { name: "chunk2.json" }],
      error: null,
    });

    mockDownload
      .mockResolvedValueOnce({
        data: new Blob([JSON.stringify(file1)], { type: "application/json" }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: new Blob([JSON.stringify(file2)], { type: "application/json" }),
        error: null,
      });

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([file1, file2]);
  });
});
