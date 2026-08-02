import { GET } from "@/app/api/user/route";
import { NextRequest } from "next/server";
import { userDrizzle } from "@db/classes/user_db";

const makeRequest = () =>
  new NextRequest("http://localhost/api/user?type=profile");

const mockGetUserProfile = vi.fn();

vi.mock("@/lib/user", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/classes/user_db", () => ({
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

describe("GET /api/user?type=profile", () => {
  it("returns 200 with the user profile from the wired db", async () => {
    const profile = {
      name: "John Doe",
      email: "john@example.com",
      jobTitle: "Engineer",
      company: "Acme",
      bio: "Hi",
    };
    mockGetUserProfile.mockResolvedValue(profile);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
    expect(mockGetUserProfile).toHaveBeenCalledWith(userDrizzle);
  });

  it("returns 500 when getUserProfile throws", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("db error"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
