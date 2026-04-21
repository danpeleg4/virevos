import { GET } from "@/app/api/google/callback/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { google } from "googleapis";

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/google_sync", () => ({
  performFullSync: jest.fn().mockResolvedValue(undefined),
  setupWatchChannel: jest.fn().mockResolvedValue(undefined),
}));

import { performFullSync, setupWatchChannel } from "@/lib/google_sync";

const mockGetToken = jest.fn();

function makeRequest(code?: string): Request {
  const url = code
    ? `http://localhost/api/google/callback?code=${code}`
    : "http://localhost/api/google/callback";
  return new Request(url);
}

function mockDbSelectEmpty() {
  (db.select as jest.Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  });
}

describe("GET /api/google/callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => ({
      getToken: mockGetToken,
    }));
    (performFullSync as jest.Mock).mockResolvedValue(undefined);
    (setupWatchChannel as jest.Mock).mockResolvedValue(undefined);
  });

  it("returns 400 if code is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing code" });
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("inserts a new token and redirects for a new user", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: "access_123",
        refresh_token: "refresh_123",
        expiry_date: 9999999999,
      },
    });
    mockDbSelectEmpty();
    const onConflictDoNothingMock = jest.fn().mockResolvedValue(undefined);
    const insertValuesMock = jest
      .fn()
      .mockReturnValue({ onConflictDoNothing: onConflictDoNothingMock });
    (db.insert as jest.Mock).mockReturnValue({ values: insertValuesMock });

    const res = await GET(makeRequest("auth_code_123"));

    expect(db.insert).toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        access_token: "access_123",
        refresh_token: "refresh_123",
        connected: true,
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace/settings");
  });

  it("updates an existing token and redirects", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: "access_new",
        refresh_token: null,
        expiry_date: 9999999999,
      },
    });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { refresh_token: "old_refresh", connected: false },
            ]),
        }),
      }),
    });
    const whereMock = jest.fn().mockResolvedValue(undefined);
    const setMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.update as jest.Mock).mockReturnValue({ set: setMock });

    const res = await GET(makeRequest("auth_code_123"));

    expect(db.update).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: "access_new",
        refresh_token: "old_refresh", // falls back to existing refresh token
        connected: true,
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace/settings");
  });

  it("still redirects when performFullSync fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: "access_123",
        refresh_token: "refresh_123",
        expiry_date: null,
      },
    });
    mockDbSelectEmpty();
    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      }),
    });
    (performFullSync as jest.Mock).mockRejectedValueOnce(
      new Error("sync error")
    );
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });

  it("still redirects when setupWatchChannel fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "user_1",
      emailAddresses: [{ emailAddress: "user@example.com" }],
      firstName: "Test",
      lastName: "User",
    });
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: "access_123",
        refresh_token: "refresh_123",
        expiry_date: null,
      },
    });
    mockDbSelectEmpty();
    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      }),
    });
    (setupWatchChannel as jest.Mock).mockRejectedValueOnce(
      new Error("watch error")
    );
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await GET(makeRequest("auth_code_123"));
    expect(res.status).toBe(307);
  });
});
