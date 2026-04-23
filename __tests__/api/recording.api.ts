import { GET } from "@/app/api/recording/[id]/route";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

// eslint-disable-next-line no-var
var mockDbWhere: jest.Mock;

jest.mock("@db/db", () => {
  mockDbWhere = jest.fn();
  return {
    db: {
      select: () => ({ from: () => ({ where: mockDbWhere }) }),
    },
  };
});

jest.mock("@db/schema", () => ({ events: {} }));
jest.mock("drizzle-orm", () => ({ and: jest.fn(), eq: jest.fn() }));

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
    mockDbWhere.mockResolvedValue([{ id: "meeting_1" }]);
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

  it("returns 404 if recording not found in storage", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockRejectedValueOnce(new Error("not found"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns 404 if getSignedUrl throws", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockRejectedValueOnce(new Error("storage error"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns signed url on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockResolvedValueOnce("https://signed-url");

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://signed-url");
  });

  it("returns 404 if event not found in db", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbWhere.mockResolvedValue([]);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });
});
