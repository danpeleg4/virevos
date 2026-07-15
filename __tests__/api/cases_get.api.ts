import { GET } from "@/app/api/cases/get-cases/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getCasesWithStats } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  getCasesWithStats: vi.fn(),
}));

vi.mock("@db/cases_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/cases/get-cases", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getCasesWithStats).not.toHaveBeenCalled();
  });

  it("returns cases with stats from the wired db", async () => {
    const payload = {
      cases: [
        {
          id: 5,
          name: "Estate Case",
          stats: { totalTasks: 2, completedTasks: 1, percentage: 50 },
        },
      ],
      allClients: [{ id: 1, name: "Jane Client" }],
    };
    (getCasesWithStats as Mock).mockResolvedValueOnce(payload);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
    expect(getCasesWithStats).toHaveBeenCalledWith(casesDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getCasesWithStats as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch cases" });
  });
});
