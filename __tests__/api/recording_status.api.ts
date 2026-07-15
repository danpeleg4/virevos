import { GET } from "@/app/api/recording/status/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { userDrizzle } from "@db/user_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/user_db", () => ({
  userDrizzle: { getUserRow: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/recording/status", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(userDrizzle.getUserRow).not.toHaveBeenCalled();
  });

  it("returns the current user's recording status from the wired db", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (userDrizzle.getUserRow as Mock).mockResolvedValueOnce([
      { recordingStatus: true },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recording_status: true });
    expect(userDrizzle.getUserRow).toHaveBeenCalledWith("user_1");
  });
});
