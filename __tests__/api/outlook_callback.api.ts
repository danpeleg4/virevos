import { GET } from "@/app/api/outlook/callback/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { exchangeOutlookCode } from "@/lib/outlook/outlook_access";
import {
  performFullSync,
  setupSubscriptions,
} from "@/lib/outlook/outlook_sync";
import { ensureUserRow } from "@/lib/user";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { userDrizzle } from "@db/classes/user_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_access", () => ({
  exchangeOutlookCode: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_sync", () => ({
  performFullSync: vi.fn().mockResolvedValue(undefined),
  setupSubscriptions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/user", () => ({
  ensureUserRow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@db/classes/outlook_db", () => ({
  outlookDrizzle: {
    __sentinel: "outlookDrizzle",
    getTokenByUserId: vi.fn(),
    updateToken: vi.fn(),
    insertToken: vi.fn(),
  },
}));

vi.mock("@db/classes/calendar_db", () => ({
  calendarDrizzle: { __sentinel: "calendarDrizzle" },
}));

vi.mock("@db/classes/user_db", () => ({
  userDrizzle: { __sentinel: "userDrizzle" },
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

const VALID_STATE = "state_token_abc";

function makeRequest(
  code?: string,
  opts: { state?: string | null; cookieState?: string | null } = {}
): Request {
  const { state = VALID_STATE, cookieState = VALID_STATE } = opts;

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (state) params.set("state", state);
  const qs = params.toString();
  const url = qs
    ? `http://localhost/api/outlook/callback?${qs}`
    : "http://localhost/api/outlook/callback";

  const headers: Record<string, string> = {};
  if (cookieState) headers.cookie = `outlook_oauth_state=${cookieState}`;

  return new Request(url, { headers });
}

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  (performFullSync as Mock).mockResolvedValue(undefined);
  (setupSubscriptions as Mock).mockResolvedValue(undefined);
  (outlookDrizzle.getTokenByUserId as Mock).mockResolvedValue([]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/outlook/callback", () => {
  it("returns 400 if code is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing code" });
  });

  it("returns 400 if the state query param is missing", async () => {
    const res = await GET(makeRequest("auth_code_123", { state: null }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid state" });
  });

  it("returns 400 if the state cookie is missing", async () => {
    const res = await GET(makeRequest("auth_code_123", { cookieState: null }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid state" });
  });

  it("returns 400 if the state does not match the cookie", async () => {
    const res = await GET(
      makeRequest("auth_code_123", { state: "evil", cookieState: "legit" })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid state" });
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("ensures the user row exists via the wired userDrizzle", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });

    await GET(makeRequest("auth_code_123"));

    expect(ensureUserRow).toHaveBeenCalledWith(userDrizzle);
  });

  it("inserts a new token for a new user", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });

    const res = await GET(makeRequest("auth_code_123"));

    expect(exchangeOutlookCode).toHaveBeenCalledWith(
      "auth_code_123",
      graphAuthService
    );
    expect(outlookDrizzle.insertToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        accessToken: "access_123",
        refreshToken: "refresh_123",
        connected: true,
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace/settings");
  });

  it("updates an existing token, keeping the old refresh token when Graph omits one", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_new",
      refresh_token: "",
      expires_at: 9999999999,
    });
    (outlookDrizzle.getTokenByUserId as Mock).mockResolvedValueOnce([
      { refreshToken: "old_refresh", connected: false },
    ]);

    const res = await GET(makeRequest("auth_code_123"));

    expect(outlookDrizzle.updateToken).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        accessToken: "access_new",
        refreshToken: "old_refresh",
        connected: true,
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace/settings");
  });

  it("triggers the full sync and subscription setup with the wired deps", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });

    await GET(makeRequest("auth_code_123"));

    expect(performFullSync).toHaveBeenCalledWith(
      "user_1",
      outlookDrizzle,
      calendarDrizzle,
      graphAuthService,
      graphMailService,
      supabaseStorageClient,
      openAIClient
    );
    expect(setupSubscriptions).toHaveBeenCalledWith(
      "user_1",
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("still redirects when performFullSync fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });
    (performFullSync as Mock).mockRejectedValueOnce(new Error("sync error"));

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });

  it("still redirects when setupSubscriptions fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });
    (setupSubscriptions as Mock).mockRejectedValueOnce(
      new Error("subscription error")
    );

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });
});
