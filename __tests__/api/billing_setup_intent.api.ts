import { GET } from "@/app/api/billing/setup-intent/route";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockCreateSetupIntent = vi.fn();

vi.mock("@/lib/workspace/billing", () => ({
  createSetupIntent: (...args: unknown[]) => mockCreateSetupIntent(...args),
}));

import { getCurrentUser } from "@/lib/supabase/auth";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/billing/setup-intent", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockCreateSetupIntent).not.toHaveBeenCalled();
  });

  it("returns 200 with the client secret when authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockCreateSetupIntent.mockResolvedValue("seti_secret_123");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ clientSecret: "seti_secret_123" });
  });

  it("returns 500 when createSetupIntent throws", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    mockCreateSetupIntent.mockRejectedValue(new Error("Stripe error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
