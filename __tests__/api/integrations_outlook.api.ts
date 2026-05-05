import { GET } from "@/app/api/integrations/outlook/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

describe("GET /api/integrations/outlook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns connected=true when token exists and is connected", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
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
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
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
