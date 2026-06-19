import { GET } from "@/app/api/user/route";
import { NextRequest } from "next/server";

const makeRequest = () =>
  new NextRequest("http://localhost/api/user?type=avatar");

const mockGetAvatarUrl = vi.fn();

vi.mock("@/lib/user", () => ({
  getAvatarUrl: (...args: unknown[]) => mockGetAvatarUrl(...args),
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
  it("returns 200 with the signed avatar url", async () => {
    mockGetAvatarUrl.mockResolvedValue({ url: "https://example.com/a.png" });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ url: "https://example.com/a.png" });
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
