import { POST } from "@/app/api/outlook/messages/route";
import { sendOutlookEmail } from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/outlook/outlook_actions", () => ({
  sendOutlookEmail: vi.fn(),
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

const body = {
  to: "client@example.com",
  subject: "Hello",
  bodyHtml: "<p>Hi</p>",
};

const makeRequest = (payload: unknown = body) =>
  new Request("http://localhost/api/outlook/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("POST /api/outlook/messages", () => {
  it("sends the email via the wired deps", async () => {
    (sendOutlookEmail as Mock).mockResolvedValueOnce({ success: true });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sendOutlookEmail).toHaveBeenCalledWith(
      body,
      outlookDrizzle,
      supabaseStorageClient,
      graphAuthService,
      graphMailService
    );
  });

  it("propagates a ValidationError status", async () => {
    (sendOutlookEmail as Mock).mockRejectedValueOnce(
      new ValidationError("Outlook account not connected", 403)
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
  });

  it("returns 500 when the send fails", async () => {
    (sendOutlookEmail as Mock).mockRejectedValueOnce(new Error("graph down"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
  });
});
