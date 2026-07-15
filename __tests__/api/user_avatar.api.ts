import { GET } from "@/app/api/user/route";
import { NextRequest } from "next/server";
import { userDrizzle } from "@db/user_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

const makeRequest = () =>
  new NextRequest("http://localhost/api/user?type=avatar");

const mockGetAvatarUrl = vi.fn();

vi.mock("@/lib/user", () => ({
  getAvatarUrl: (...args: unknown[]) => mockGetAvatarUrl(...args),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/user_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  // sentinel — the route must pass this exact storage client
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

describe("GET /api/user?type=avatar", () => {
  it("returns 200 with the signed avatar url from the wired deps", async () => {
    mockGetAvatarUrl.mockResolvedValue({ url: "https://example.com/a.png" });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://example.com/a.png" });
    expect(mockGetAvatarUrl).toHaveBeenCalledWith(
      userDrizzle,
      supabaseStorageClient
    );
  });

  it("returns 200 with null url when no avatar set", async () => {
    mockGetAvatarUrl.mockResolvedValue({ url: null });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: null });
  });

  it("returns 500 when getAvatarUrl throws", async () => {
    mockGetAvatarUrl.mockRejectedValue(new Error("storage error"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
