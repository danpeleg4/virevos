import { GET } from "@/app/api/cases/[id]/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  (console.error as Mock).mockRestore();
});

// ─────────────────────────────
// Mocks
// ─────────────────────────────

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Drizzle chain mock helper
function mockDrizzleResult(result: unknown) {
  (db.select as Mock).mockReturnValue({
    from: () => ({
      leftJoin: () => ({
        where: () => ({
          limit: () => result,
        }),
      }),
    }),
  });
}

const mockRequest = {} as NextRequest;

// ─────────────────────────────
// Tests
// ─────────────────────────────

describe("GET /api/cases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 if caseId is invalid", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid caseId" });
  });

  it("returns 404 if case is not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockDrizzleResult([]);

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Case not found" });
  });

  it("returns case data when found", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    mockDrizzleResult([
      {
        id: 1,
        name: "Case A",
        clientId: 10,
        clientName: "Client X",
      },
    ]);

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: 1,
      name: "Case A",
      clientId: 10,
      clientName: "Client X",
    });
  });

  it("returns 500 on unexpected error", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (db.select as Mock).mockImplementation(() => {
      throw new Error("DB crashed");
    });

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Internal server error",
    });
  });
});
