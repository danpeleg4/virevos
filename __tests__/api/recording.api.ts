import { GET } from "@/app/api/recording/[id]/route";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// eslint-disable-next-line no-var
var mockDbWhere: Mock;

vi.mock("@db/db", () => {
  mockDbWhere = vi.fn();
  return {
    db: {
      select: () => ({ from: () => ({ where: mockDbWhere }) }),
    },
  };
});

vi.mock("@db/schema", () => ({ events: {} }));
vi.mock("drizzle-orm", () => ({ and: vi.fn(), eq: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  RECORDINGS_BUCKET: "recording",
}));

// eslint-disable-next-line no-var
var mockGetSignedUrl: Mock;

vi.mock("@/lib/storage", () => {
  mockGetSignedUrl = vi.fn();
  return { getSignedUrl: mockGetSignedUrl };
});

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/recording/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDbWhere.mockResolvedValue([{ id: "meeting_1" }]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 if id is empty", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 if recording not found in storage", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockRejectedValueOnce(new Error("not found"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns 404 if getSignedUrl throws", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockRejectedValueOnce(new Error("storage error"));

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });

  it("returns signed url on success", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockGetSignedUrl.mockResolvedValueOnce("https://signed-url");

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://signed-url");
  });

  it("returns 404 if event not found in db", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDbWhere.mockResolvedValue([]);

    const res = await GET({} as NextRequest, mockCtx("meeting_1"));

    expect(res.status).toBe(404);
  });
});
