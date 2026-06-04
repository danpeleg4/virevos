import { GET } from "@/app/api/user/profile/route";

const mockGetUserProfile = vi.fn();

vi.mock("@/lib/user", () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/user/profile", () => {
  it("returns 200 with the user profile", async () => {
    const profile = {
      name: "John Doe",
      email: "john@example.com",
      jobTitle: "Engineer",
      company: "Acme",
      bio: "Hi",
    };
    mockGetUserProfile.mockResolvedValue(profile);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
  });

  it("returns 500 when getUserProfile throws", async () => {
    mockGetUserProfile.mockRejectedValue(new Error("db error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
