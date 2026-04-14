import { GET } from "@/app/api/cron/credit-reset/route";

const mockReturning = jest.fn();
const mockWhere = jest.fn(() => ({ returning: mockReturning }));
const mockSet = jest.fn(() => ({ where: mockWhere }));
const mockUpdate = jest.fn<unknown, unknown[]>(() => ({ set: mockSet }));

jest.mock("@db/db", () => ({
  db: { update: (...args: unknown[]) => mockUpdate(...args) },
}));

jest.mock("@db/schema", () => ({
  users: { creditsResetAt: "creditsResetAt", user_id: "user_id" },
}));

jest.mock("drizzle-orm", () => ({
  or: jest.fn((...args) => ({ type: "or", args })),
  isNull: jest.fn((col) => ({ type: "isNull", col })),
  lte: jest.fn((col, val) => ({ type: "lte", col, val })),
}));

const makeRequest = (token?: string) =>
  ({
    headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}),
  }) as Request;

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  process.env.CRON_SECRET = "test-secret";
  mockReturning.mockResolvedValue([]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/cron/credit-reset", () => {
  it("returns 401 when no authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when wrong token", async () => {
    const res = await GET(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
  });

  it("resets credits for due users and returns count", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }]);
    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ reset: 2 });
  });

  it("sets ai_credits to 0 and updates creditsResetAt ~30 days from now", async () => {
    mockReturning.mockResolvedValueOnce([{ id: "u1" }]);
    const before = Date.now();
    await GET(makeRequest("test-secret"));
    const after = Date.now();

    expect(mockSet).toHaveBeenCalledTimes(1);
    const setArg = (mockSet.mock.calls[0] as unknown[])[0] as {
      ai_credits: number;
      creditsResetAt: Date;
    };
    expect(setArg.ai_credits).toBe(0);
    const resetMs = setArg.creditsResetAt.getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(resetMs).toBeGreaterThanOrEqual(before + thirtyDays);
    expect(resetMs).toBeLessThanOrEqual(after + thirtyDays);
  });

  it("returns 500 when db throws", async () => {
    mockReturning.mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Cron failed" });
  });
});
