import { GET } from "@/app/api/cron/process-scheduled-emails/route";
import { processDueScheduledEmails } from "@/lib/scheduled_emails";
import { scheduledEmailsDrizzle } from "@db/scheduled_emails_db";
import { scheduledEmailService } from "@/api_client/ms_graph/scheduled_email_service";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

vi.mock("@db/scheduled_emails_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  scheduledEmailsDrizzle: { __sentinel: "scheduledEmailsDrizzle" },
}));

vi.mock("@/lib/scheduled_emails", () => ({
  processDueScheduledEmails: vi.fn(),
}));

vi.mock("@/api_client/ms_graph/scheduled_email_service", () => ({
  // sentinel — the route must pass this exact service into the lib fn
  scheduledEmailService: { __sentinel: "scheduledEmailService" },
}));

vi.mock("@db/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

const cronRequest = (auth?: string) =>
  new Request("http://localhost/api/cron/process-scheduled-emails", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  process.env.CRON_SECRET = "cron-secret";
});

describe("GET /api/cron/process-scheduled-emails", () => {
  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());

    expect(res.status).toBe(401);
    expect(processDueScheduledEmails).not.toHaveBeenCalled();
  });

  it("returns 401 with a wrong cron secret", async () => {
    const res = await GET(cronRequest("Bearer wrong"));

    expect(res.status).toBe(401);
    expect(processDueScheduledEmails).not.toHaveBeenCalled();
  });

  it("processes due emails through the lib fn with the wired deps", async () => {
    (processDueScheduledEmails as Mock).mockResolvedValueOnce({ processed: 3 });

    const res = await GET(cronRequest("Bearer cron-secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 3 });
    expect(processDueScheduledEmails).toHaveBeenCalledWith(
      scheduledEmailsDrizzle,
      scheduledEmailService,
      outlookDrizzle,
      graphAuthService,
      supabaseStorageClient
    );
  });

  it("returns 500 when processing fails", async () => {
    (processDueScheduledEmails as Mock).mockRejectedValueOnce(
      new Error("db down")
    );

    const res = await GET(cronRequest("Bearer cron-secret"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Cron failed" });
  });
});
