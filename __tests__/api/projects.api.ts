import { GET } from "@/app/api/projects/[id]/route";
import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

// ─────────────────────────────
// Mocks
// ─────────────────────────────

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// Drizzle chain mock helper
function mockDrizzleResult(result: unknown) {
  (db.select as jest.Mock).mockReturnValue({
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

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "1" }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 if projectId is invalid", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid projectId" });
  });

  it("returns 404 if project is not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDrizzleResult([]);

    const res = await GET(mockRequest, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Project not found" });
  });

  it("returns project data when found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    mockDrizzleResult([
      {
        id: 1,
        name: "Project A",
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
      name: "Project A",
      clientId: 10,
      clientName: "Client X",
    });
  });

  it("returns 500 on unexpected error", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockImplementation(() => {
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
