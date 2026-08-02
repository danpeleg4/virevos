import { GET, POST } from "@/app/api/outlook/sync/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  listOutlookEmails,
  syncOutlookInbox,
} from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_actions", () => ({
  listOutlookEmails: vi.fn(),
  syncOutlookInbox: vi.fn(),
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: { __sentinel: "outlookDrizzle" },
}));

vi.mock("@db/classes/calendar_db", () => ({
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

vi.mock("@/api_client/openai_client", () => ({
  openAIClient: { __sentinel: "openAIClient" },
}));

function makeGetRequest(params?: Record<string, string>): Request {
  const url = new URL("http://localhost/api/outlook/sync");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/outlook/sync", () => {
  it("returns 401 if not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(401);
    expect(listOutlookEmails).not.toHaveBeenCalled();
  });

  it("returns paginated messages from the wired db, with default pagination", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    const result = {
      messages: [{ id: "1", subject: "Hello" }],
      page: 1,
      limit: 50,
      hasMore: false,
    };
    (listOutlookEmails as Mock).mockResolvedValueOnce(result);

    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(listOutlookEmails).toHaveBeenCalledWith(
      "user_1",
      { page: 1, limit: 50, search: "", filter: "all" },
      outlookDrizzle
    );
  });

  it("passes through custom pagination/search/filter params", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (listOutlookEmails as Mock).mockResolvedValueOnce({
      messages: [],
      page: 2,
      limit: 10,
      hasMore: false,
    });

    await GET(
      makeGetRequest({
        page: "2",
        limit: "10",
        search: "invoice",
        filter: "starred",
      }) as Parameters<typeof GET>[0]
    );

    expect(listOutlookEmails).toHaveBeenCalledWith(
      "user_1",
      { page: 2, limit: 10, search: "invoice", filter: "starred" },
      outlookDrizzle
    );
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (listOutlookEmails as Mock).mockRejectedValueOnce(new Error("db error"));

    const res = await GET(makeGetRequest() as Parameters<typeof GET>[0]);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/outlook/sync", () => {
  it("triggers an incremental sync through the wired deps", async () => {
    (syncOutlookInbox as Mock).mockResolvedValueOnce({ success: true });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(syncOutlookInbox).toHaveBeenCalledWith(
      outlookDrizzle,
      calendarDrizzle,
      graphAuthService,
      graphMailService,
      supabaseStorageClient,
      openAIClient
    );
  });

  it("propagates a ValidationError status", async () => {
    (syncOutlookInbox as Mock).mockRejectedValueOnce(
      new ValidationError("Unauthorized", 401)
    );

    const res = await POST();

    expect(res.status).toBe(401);
  });

  it("returns 500 when the sync fails", async () => {
    (syncOutlookInbox as Mock).mockRejectedValueOnce(new Error("graph down"));

    const res = await POST();

    expect(res.status).toBe(500);
  });
});
