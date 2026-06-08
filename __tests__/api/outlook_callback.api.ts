import { GET } from "@/app/api/outlook/callback/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/outlook/outlook_access", () => ({
  exchangeOutlookCode: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_sync", () => ({
  performFullSync: vi.fn().mockResolvedValue(undefined),
  setupSubscriptions: vi.fn().mockResolvedValue(undefined),
}));

import { exchangeOutlookCode } from "@/lib/outlook/outlook_access";
import {
  performFullSync,
  setupSubscriptions,
} from "@/lib/outlook/outlook_sync";

function makeRequest(code?: string): Request {
  const url = code
    ? `http://localhost/api/outlook/callback?code=${code}`
    : "http://localhost/api/outlook/callback";
  return new Request(url);
}

function mockDbSelectEmpty() {
  (db.select as Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  });
}

describe("GET /api/outlook/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    (performFullSync as Mock).mockResolvedValue(undefined);
    (setupSubscriptions as Mock).mockResolvedValue(undefined);
  });

  it("returns 400 if code is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing code" });
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("inserts a new token and redirects for a new user", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });
    mockDbSelectEmpty();
    const onConflictDoNothingMock = vi.fn().mockResolvedValue(undefined);
    const insertValuesMock = vi
      .fn()
      .mockReturnValue({ onConflictDoNothing: onConflictDoNothingMock });
    (db.insert as Mock).mockReturnValue({ values: insertValuesMock });

    const res = await GET(makeRequest("auth_code_123"));

    expect(db.insert).toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith(
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

  it("updates an existing token and redirects", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_new",
      refresh_token: "",
      expires_at: 9999999999,
    });
    (db.select as Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { refreshToken: "old_refresh", connected: false },
            ]),
        }),
      }),
    });
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    (db.update as Mock).mockReturnValue({ set: setMock });

    const res = await GET(makeRequest("auth_code_123"));

    expect(db.update).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "access_new",
        refreshToken: "old_refresh",
        connected: true,
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace/settings");
  });

  it("still redirects when performFullSync fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });
    mockDbSelectEmpty();
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (performFullSync as Mock).mockRejectedValueOnce(new Error("sync error"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });

  it("still redirects when setupSubscriptions fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    (exchangeOutlookCode as Mock).mockResolvedValue({
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: 9999999999,
    });
    mockDbSelectEmpty();
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (setupSubscriptions as Mock).mockRejectedValueOnce(
      new Error("subscription error")
    );
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });
});
