import { GET } from "@/app/api/user/product-updates/route";

const mockGetProductUpdatesPreference = vi.fn();

vi.mock("@/lib/user", () => ({
  getProductUpdatesPreference: (...args: unknown[]) =>
    mockGetProductUpdatesPreference(...args),
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/user/product-updates", () => {
  it("returns 200 with true when enabled", async () => {
    mockGetProductUpdatesPreference.mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(true);
  });

  it("returns 200 with false when disabled", async () => {
    mockGetProductUpdatesPreference.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(false);
  });

  it("returns 500 when the preference lookup throws", async () => {
    mockGetProductUpdatesPreference.mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
