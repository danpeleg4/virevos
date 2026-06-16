import { NextRequest } from "next/server";
import { GET as getClient } from "@/app/api/clients/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

const mockUser = { id: "user_abc" };

const makeReq = (type?: string) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(type ? { type } : undefined) },
  }) as unknown as NextRequest;

// Default request targets the "main" handler (client + portal lookup)
const req = makeReq("main");

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/clients/[id]", () => {
  const params = Promise.resolve({ id: "42" });

  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await getClient(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const res = await getClient(req, {
      params: Promise.resolve({ id: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when client not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const limit = vi.fn().mockResolvedValue([]);
    const groupBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ groupBy }));
    const leftJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ leftJoin }));
    (db.select as Mock).mockReturnValueOnce({ from });

    const res = await getClient(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns client + portal=null when found with no portal", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const clientRow = {
      id: 42,
      name: "Acme",
      email: "a@b.com",
      phone: "555",
      status: "active",
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      totalCases: 0,
      completedCases: 0,
      activeCases: 0,
    };

    // First db.select() call — client lookup
    const limit1 = vi.fn().mockResolvedValue([clientRow]);
    const groupBy = vi.fn(() => ({ limit: limit1 }));
    const where1 = vi.fn(() => ({ groupBy }));
    const leftJoin = vi.fn(() => ({ where: where1 }));
    const from1 = vi.fn(() => ({ leftJoin }));

    // Second db.select() call — portal lookup
    const limit2 = vi.fn().mockResolvedValue([]);
    const where2 = vi.fn(() => ({ limit: limit2 }));
    const from2 = vi.fn(() => ({ where: where2 }));

    (db.select as Mock)
      .mockReturnValueOnce({ from: from1 })
      .mockReturnValueOnce({ from: from2 });

    const res = await getClient(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.client).toEqual(clientRow);
    expect(json.portal).toBeNull();
  });

  it("returns 500 on db error", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await getClient(req, { params });
    expect(res.status).toBe(500);
  });

  it("returns 400 for an unknown type", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const res = await getClient(makeReq("bogus"), { params });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid type");
  });

  it("returns 400 when no type is provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const res = await getClient(makeReq(), { params });
    expect(res.status).toBe(400);
  });
});
