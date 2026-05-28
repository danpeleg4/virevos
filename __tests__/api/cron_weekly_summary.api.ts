import { GET } from "@/app/api/cron/weekly-summary/route";
import {
  listUsersWithWeeklySummary,
  sendWeeklySummary,
} from "@/lib/weekly_summary";

vi.mock("@/lib/weekly_summary", () => ({
  listUsersWithWeeklySummary: vi.fn(),
  sendWeeklySummary: vi.fn(),
}));

function req(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/cron/weekly-summary", {
    headers,
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "secret";
});

describe("GET /api/cron/weekly-summary", () => {
  it("401 when authorization header is missing or wrong", async () => {
    const noAuth = await GET(req());
    expect(noAuth.status).toBe(401);

    const wrong = await GET(req("Bearer wrong"));
    expect(wrong.status).toBe(401);

    expect(listUsersWithWeeklySummary).not.toHaveBeenCalled();
  });

  it("returns zeros when nobody opted in", async () => {
    (listUsersWithWeeklySummary as Mock).mockResolvedValueOnce([]);
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      total: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    });
    expect(sendWeeklySummary).not.toHaveBeenCalled();
  });

  it("tallies sent, skipped, and failed across users", async () => {
    (listUsersWithWeeklySummary as Mock).mockResolvedValueOnce([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
    ]);
    (sendWeeklySummary as Mock)
      .mockResolvedValueOnce({ emailId: "e1" })
      .mockResolvedValueOnce({ skipped: "preference_off" })
      .mockRejectedValueOnce(new Error("boom"));

    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      total: 3,
      sent: 1,
      skipped: 1,
      failed: 1,
    });
    expect(sendWeeklySummary).toHaveBeenCalledTimes(3);
  });

  it("500 when listing users blows up", async () => {
    (listUsersWithWeeklySummary as Mock).mockRejectedValueOnce(
      new Error("db down")
    );
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(500);
  });
});
