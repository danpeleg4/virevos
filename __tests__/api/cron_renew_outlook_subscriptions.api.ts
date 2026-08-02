import { GET } from "@/app/api/cron/renew-outlook-subscriptions/route";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { renewSubscriptions } from "@/lib/outlook/outlook_sync";

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: {
    __sentinel: "outlookDrizzle",
    getExpiringSyncStates: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

vi.mock("@/lib/outlook/outlook_sync", () => ({
  renewSubscriptions: vi.fn().mockResolvedValue(undefined),
}));

const cronRequest = (auth?: string) =>
  new Request("http://localhost/api/cron/renew-outlook-subscriptions", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  vi.clearAllMocks();
  (outlookDrizzle.getExpiringSyncStates as Mock).mockResolvedValue([]);
  process.env.CRON_SECRET = "cron-secret";
});

describe("GET /api/cron/renew-outlook-subscriptions", () => {
  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());

    expect(res.status).toBe(401);
    expect(renewSubscriptions).not.toHaveBeenCalled();
  });

  it("returns 401 with a wrong cron secret", async () => {
    const res = await GET(cronRequest("Bearer wrong"));

    expect(res.status).toBe(401);
    expect(renewSubscriptions).not.toHaveBeenCalled();
  });

  it("renews subscriptions expiring within 24h, wired with the singletons", async () => {
    (outlookDrizzle.getExpiringSyncStates as Mock).mockResolvedValueOnce([
      { userId: "user_1" },
      { userId: "user_2" },
    ]);

    const res = await GET(cronRequest("Bearer cron-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ renewed: 2 });
    expect(renewSubscriptions).toHaveBeenCalledWith(
      "user_1",
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
    expect(renewSubscriptions).toHaveBeenCalledWith(
      "user_2",
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("returns renewed: 0 when nothing is expiring", async () => {
    const res = await GET(cronRequest("Bearer cron-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ renewed: 0 });
    expect(renewSubscriptions).not.toHaveBeenCalled();
  });
});
