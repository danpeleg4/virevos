import { GET } from "@/app/api/transcript/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

// eslint-disable-next-line no-var
var mockSelect: Mock;

vi.mock("@db/db", () => {
  mockSelect = vi.fn();
  return { db: { select: mockSelect } };
});

vi.mock("@db/schema", () => ({ events: {}, meetingTranscripts: {} }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
  asc: vi.fn(),
}));

function mockCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeEventsChain(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(result),
    })),
  };
}

function makeTranscriptsChain(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe("GET /api/transcript/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect
      .mockReturnValueOnce(
        makeEventsChain([
          { id: "abc123_xyz", meetingStartTimeEpoch: 1700000000 },
        ])
      )
      .mockReturnValueOnce(makeTranscriptsChain([]));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 400 if id is empty", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid meetingId" });
  });

  it("returns 404 if meeting not found", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockSelect.mockReset().mockReturnValueOnce(makeEventsChain([]));

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
  });

  it("returns 404 if no transcript chunks found", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    // default beforeEach gives empty chunks

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No transcript found" });
  });

  it("returns 404 if meeting has no meetingStartTimeEpoch", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockSelect
      .mockReset()
      .mockReturnValueOnce(makeEventsChain([{ id: "abc123_xyz" }]));

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(404);
  });

  it("returns parsed chunks from all transcript rows", async () => {
    (currentUser as Mock).mockResolvedValue({ id: "user_1" });

    const chunks = [
      { speaker: "Alice", text: "Hello", createdAt: new Date("2026-01-01") },
      { speaker: "Bob", text: "Hi", createdAt: new Date("2026-01-01") },
    ];

    mockSelect
      .mockReset()
      .mockReturnValueOnce(
        makeEventsChain([
          { id: "abc123_xyz", meetingStartTimeEpoch: 1700000000 },
        ])
      )
      .mockReturnValueOnce(makeTranscriptsChain(chunks));

    const res = await GET({} as NextRequest, mockCtx("abc123_xyz"));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meetingStartTimeEpoch).toBe(1700000000);
    expect(json.chunks).toHaveLength(2);
    expect(json.chunks[0].speaker).toBe("Alice");
    expect(json.chunks[1].speaker).toBe("Bob");
  });
});
