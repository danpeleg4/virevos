import { GET } from "@/app/api/recording/[id]/route";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  RECORDINGS_BUCKET: "recording",
  supabaseAdmin: {
    storage: {
      from: jest.fn(),
    },
  },
}));

// eslint-disable-next-line no-var
var mockGetSignedUrl: jest.Mock;

jest.mock("@/lib/storage", () => {
  mockGetSignedUrl = jest.fn();
  return { getSignedUrl: mockGetSignedUrl };
});

import { supabaseAdmin } from "@/lib/supabase";

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mockStorage(topLevel: { name: string }[], folderFiles: { name: string }[]) {
  const listMock = jest.fn()
    .mockResolvedValueOnce({ data: topLevel, error: null })
    .mockResolvedValue({ data: folderFiles, error: null });
  (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({ list: listMock });
}

describe("GET /api/recording/[id]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 if id is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 if no participant folders found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockStorage([], []);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns 404 if participant folders have no mp4 files", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockStorage([{ name: "Alice" }], [{ name: "meta.json" }]);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns signed urls for all participants on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const listMock = jest.fn()
      .mockResolvedValueOnce({ data: [{ name: "Alice" }, { name: "Bob" }], error: null })
      .mockResolvedValueOnce({ data: [{ name: "abc12.mp4" }], error: null })
      .mockResolvedValueOnce({ data: [{ name: "def34.mp4" }], error: null });
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({ list: listMock });

    mockGetSignedUrl
      .mockResolvedValueOnce("https://signed-url-alice")
      .mockResolvedValueOnce("https://signed-url-bob");

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.videos).toHaveLength(2);
    expect(json.videos[0]).toEqual({ participant: "Alice", url: "https://signed-url-alice" });
    expect(json.videos[1]).toEqual({ participant: "Bob", url: "https://signed-url-bob" });
  });

  it("returns 404 if storage list throws", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue({ data: null, error: { message: "bucket error" } }),
    });

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });
});
