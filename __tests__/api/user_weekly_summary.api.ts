import { GET } from "@/app/api/user/weekly-summary/route";

const mockGetWeeklySummaryPreference = vi.fn();

vi.mock("@/lib/user", () => ({
  getWeeklySummaryPreference: (...args: unknown[]) =>
    mockGetWeeklySummaryPreference(...args),
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/user/weekly-summary", () => {
  it("returns 200 with true when enabled", async () => {
    mockGetWeeklySummaryPreference.mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(true);
  });

  it("returns 200 with false when disabled", async () => {
    mockGetWeeklySummaryPreference.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(false);
  });

  it("returns 500 when the preference lookup throws", async () => {
    mockGetWeeklySummaryPreference.mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
