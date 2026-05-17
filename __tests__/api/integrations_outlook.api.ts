import { GET } from "@/app/api/integrations/outlook/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/integrations/outlook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns connected=true when token exists and is connected", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (db.select as Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ connected: true }]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true });
  });

  it("returns connected=false when no token exists", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (db.select as Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });
});
