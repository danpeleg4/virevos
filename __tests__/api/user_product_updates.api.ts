import { GET } from "@/app/api/user/route";
import { NextRequest } from "next/server";
import { userDrizzle } from "@db/user_db";

const makeRequest = () =>
  new NextRequest("http://localhost/api/user?type=product-updates");

const mockGetProductUpdatesPreference = vi.fn();

vi.mock("@/lib/user", () => ({
  getProductUpdatesPreference: (...args: unknown[]) =>
    mockGetProductUpdatesPreference(...args),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/user_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
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
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(true);
    expect(mockGetProductUpdatesPreference).toHaveBeenCalledWith(userDrizzle);
  });

  it("returns 200 with false when disabled", async () => {
    mockGetProductUpdatesPreference.mockResolvedValue(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(false);
  });

  it("returns 500 when the preference lookup throws", async () => {
    mockGetProductUpdatesPreference.mockRejectedValue(new Error("db error"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
