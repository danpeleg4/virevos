import { GET } from "@/app/api/recording/[id]/route";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  RECORDINGS_BUCKET: "recording",
}));

// eslint-disable-next-line no-var
var mockGetSignedUrl: jest.Mock;

jest.mock("@/lib/storage", () => {
  mockGetSignedUrl = jest.fn();
  return { getSignedUrl: mockGetSignedUrl };
});

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
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

  it("returns signed url on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockResolvedValue("https://signed-url");

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://signed-url");
  });

  it("returns 404 if file not found in storage", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockRejectedValue(new Error("Not found"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "main.mp4 not found" });
  });
});
