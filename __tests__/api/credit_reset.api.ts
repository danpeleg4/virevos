import { GET } from "@/app/api/cron/credit-reset/route";
import { resetDueAiCredits } from "@/lib/plan_limits";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";

vi.mock("@/lib/plan_limits", () => ({
  resetDueAiCredits: vi.fn(),
}));

vi.mock("@db/classes/plan_limits_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

const makeRequest = (token?: string) =>
  ({
    headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}),
  }) as Request;

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.CRON_SECRET = "test-secret";
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
    expect(resetDueAiCredits).not.toHaveBeenCalled();
  });

  it("returns 401 when wrong token", async () => {
    const res = await GET(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
  });

  it("resets credits through the lib fn with the wired db", async () => {
    (resetDueAiCredits as Mock).mockResolvedValueOnce({ reset: 2 });

    const res = await GET(makeRequest("test-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reset: 2 });
    expect(resetDueAiCredits).toHaveBeenCalledWith(planLimitsDrizzle);
  });

  it("returns 500 when the reset fails", async () => {
    (resetDueAiCredits as Mock).mockRejectedValueOnce(new Error("DB error"));

    const res = await GET(makeRequest("test-secret"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Cron failed" });
  });
});
