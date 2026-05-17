import { db } from "@db/db";

// These must be var (not const/let) so they're hoisted and can be assigned
// inside the vi.mock factory before google_sync.ts imports are resolved
/* eslint-disable no-var */
var mockEventsList: Mock;
var mockEventsWatch: Mock;
var mockChannelsStop: Mock;
var mockCalendar: Mock;
/* eslint-enable no-var */

vi.mock("googleapis", () => {
  mockEventsList = vi.fn();
  mockEventsWatch = vi.fn();
  mockChannelsStop = vi.fn();
  mockCalendar = vi.fn().mockReturnValue({
    events: { list: mockEventsList, watch: mockEventsWatch },
    channels: { stop: mockChannelsStop },
  });
  return {
    google: {
      auth: {
        OAuth2: vi.fn(function () {
          return { setCredentials: vi.fn() };
        }),
      },
      calendar: mockCalendar,
    },
  };
});

vi.mock("@/lib/google/google_access", () => ({
  getFreshGoogleAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
}));

vi.mock("@db/db", () => {
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };
  // Run the transaction callback against the same mock so tx.* assertions
  // line up with the existing db.* spies.
  dbMock.transaction.mockImplementation((cb: (tx: typeof dbMock) => unknown) =>
    cb(dbMock)
  );
  return { db: dbMock };
});

// Import AFTER mocks are registered
import {
  getCalendarClient,
  performFullSync,
  performIncrementalSync,
  setupWatchChannel,
  stopWatchChannel,
} from "@/lib/google/google_sync";
import { getFreshGoogleAccessToken } from "@/lib/google/google_access";

// Builds a single mock return value for db.select() that supports both:
//   await db.select().from(x).where(y)           (no limit, used in applyGoogleEventsToDb)
//   await db.select().from(x).where(y).limit(n)  (used in syncToken/channel lookups)
function makeSelectReturn(rows: unknown[]) {
  return {
    from: () => ({
      where: () => {
        const p = Promise.resolve(rows);
        (p as unknown as { limit: () => Promise<unknown[]> }).limit = () =>
          Promise.resolve(rows);
        return p;
      },
    }),
  };
}

// Mock db.select to always return given rows (all calls get same result)
function mockSelect(rows: unknown[]) {
  (db.select as Mock).mockReturnValue(makeSelectReturn(rows));
}

// Mock db.select for two sequential patterns:
//   first call  → firstRows  (e.g. syncToken lookup with .limit())
//   later calls → laterRows  (e.g. events lookup without .limit())
function mockSelectSequence(firstRows: unknown[], laterRows: unknown[]) {
  (db.select as Mock)
    .mockReturnValueOnce(makeSelectReturn(firstRows))
    .mockReturnValue(makeSelectReturn(laterRows));
}

// Helper: set up standard DB mocks for a full-sync path
function mockFullSyncDb() {
  mockSelect([]);
  (db.insert as Mock).mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  });
  (db.update as Mock).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  (db.delete as Mock).mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
}

describe("getCalendarClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when no access token exists", async () => {
    (getFreshGoogleAccessToken as Mock).mockResolvedValueOnce(null);
    await expect(getCalendarClient("user_1")).rejects.toThrow();
  });

  it("returns a calendar client when token exists", async () => {
    const client = await getCalendarClient("user_1");
    expect(client).toBeDefined();
    expect(mockCalendar).toHaveBeenCalledWith({
      version: "v3",
      auth: expect.anything(),
    });
  });
});

describe("performFullSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFreshGoogleAccessToken as Mock).mockResolvedValue("mock-access-token");
  });

  it("fetches events and stores syncToken on a single page", async () => {
    mockEventsList.mockResolvedValueOnce({
      data: { items: [], nextSyncToken: "sync-token-abc" },
    });
    mockFullSyncDb();

    await performFullSync("user_1");

    expect(mockEventsList).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        singleEvents: true,
      })
    );
    expect(db.insert).toHaveBeenCalled();
  });

  it("paginates through multiple pages and uses nextSyncToken from last page", async () => {
    mockEventsList
      .mockResolvedValueOnce({ data: { items: [], nextPageToken: "page-2" } })
      .mockResolvedValueOnce({
        data: { items: [], nextSyncToken: "final-sync-token" },
      });
    mockFullSyncDb();

    await performFullSync("user_1");

    expect(mockEventsList).toHaveBeenCalledTimes(2);
    expect(mockEventsList).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageToken: "page-2" })
    );
  });

  it("batches deletes/updates/inserts inside a single transaction", async () => {
    const now = new Date();
    const inWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    mockSelectSequence(
      [
        // Existing rows: one will be removed (no longer in Google) and one will
        // be updated (title changed).
        {
          id: "removed-1",
          googleEventId: "removed-1",
          origin: "google_calendar",
          title: "old",
          description: null,
          link: null,
          dateTime: inWindow,
          duration: 30,
          status: "confirmed",
          isMeeting: false,
        },
        {
          id: "updated-1",
          googleEventId: "updated-1",
          origin: "google_calendar",
          title: "old title",
          description: null,
          link: null,
          dateTime: inWindow,
          duration: 30,
          status: "confirmed",
          isMeeting: false,
        },
      ],
      []
    );

    mockEventsList.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "updated-1",
            summary: "new title",
            start: { dateTime: inWindow.toISOString() },
            end: { dateTime: inWindow.toISOString() },
            status: "confirmed",
          },
          {
            id: "new-1",
            summary: "brand new",
            start: { dateTime: inWindow.toISOString() },
            end: { dateTime: inWindow.toISOString() },
            status: "confirmed",
          },
        ],
        nextSyncToken: "tok",
      },
    });

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const insertValues = vi.fn().mockResolvedValue(undefined);
    (db.delete as Mock).mockReturnValue({ where: deleteWhere });
    (db.update as Mock).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: updateWhere }),
    });
    (db.insert as Mock)
      .mockReturnValueOnce({ values: insertValues })
      .mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });

    await performFullSync("user_1");

    // The transaction was used (not direct db calls for the events writes).
    expect((db.transaction as Mock).mock.calls.length).toBeGreaterThan(0);
    // One batched delete (for removed-1) — not one per row.
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    // One update for the changed row.
    expect(updateWhere).toHaveBeenCalledTimes(1);
    // One bulk insert containing the new row.
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ id: "new-1", googleEventId: "new-1" }),
    ]);
  });
});

describe("performIncrementalSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFreshGoogleAccessToken as Mock).mockResolvedValue("mock-access-token");
  });

  it("falls back to full sync when no syncToken is stored (null)", async () => {
    // First select: syncToken lookup returns null; subsequent: empty events list
    mockSelectSequence([{ syncToken: null }], []);

    mockEventsList.mockResolvedValueOnce({
      data: { items: [], nextSyncToken: "new-sync-token" },
    });
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await performIncrementalSync("user_1");

    // Full sync no longer uses timeMin/timeMax (to get nextSyncToken from Google)
    expect(mockEventsList).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: "primary", singleEvents: true })
    );
    expect(mockEventsList).not.toHaveBeenCalledWith(
      expect.objectContaining({ syncToken: expect.any(String) })
    );
  });

  it("falls back to full sync when no sync state row exists", async () => {
    // First select: no rows; subsequent: empty events list
    mockSelectSequence([], []);

    mockEventsList.mockResolvedValueOnce({
      data: { items: [], nextSyncToken: "new-sync-token" },
    });
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await performIncrementalSync("user_1");

    // Full sync no longer uses timeMin/timeMax (to get nextSyncToken from Google)
    expect(mockEventsList).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: "primary", singleEvents: true })
    );
    expect(mockEventsList).not.toHaveBeenCalledWith(
      expect.objectContaining({ syncToken: expect.any(String) })
    );
  });

  it("calls events.list with syncToken when one is stored", async () => {
    // First select: syncToken lookup; subsequent: empty existing events
    mockSelectSequence([{ syncToken: "existing-token" }], []);

    mockEventsList.mockResolvedValueOnce({
      data: { items: [], nextSyncToken: "new-token" },
    });
    (db.update as Mock).mockReturnValue({
      set: vi
        .fn()
        .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await performIncrementalSync("user_1");

    expect(mockEventsList).toHaveBeenCalledWith(
      expect.objectContaining({ syncToken: "existing-token" })
    );
  });

  it("falls back to full sync on 410 Gone error", async () => {
    // First select: returns expired syncToken; subsequent: empty existing events (full sync fallback)
    mockSelectSequence([{ syncToken: "expired-token" }], []);
    vi.spyOn(console, "log").mockImplementationOnce(() => {});

    const goneError = Object.assign(new Error("Gone"), { code: 410 });
    mockEventsList.mockRejectedValueOnce(goneError).mockResolvedValueOnce({
      data: { items: [], nextSyncToken: "new-token" },
    });

    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await expect(performIncrementalSync("user_1")).resolves.not.toThrow();
    // First call fails (410), second call is the full sync fallback
    expect(mockEventsList).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-410 errors", async () => {
    (db.select as Mock).mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ syncToken: "token" }]),
        }),
      }),
    });

    const networkError = Object.assign(new Error("Network error"), {
      code: 500,
    });
    mockEventsList.mockRejectedValueOnce(networkError);

    await expect(performIncrementalSync("user_1")).rejects.toThrow(
      "Network error"
    );
  });
});

describe("setupWatchChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFreshGoogleAccessToken as Mock).mockResolvedValue("mock-access-token");
    // Jest runs with NODE_ENV=test (non-production), so setupWatchChannel uses NEXT_PUBLIC_APP_URL_NGROK
    process.env.NEXT_PUBLIC_APP_URL_NGROK = "https://example.ngrok.io";
  });

  it("calls events.watch with correct parameters and upserts sync state", async () => {
    mockEventsWatch.mockResolvedValueOnce({
      data: { resourceId: "resource-id-123", expiration: "1700000000000" },
    });
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await setupWatchChannel("user_1");

    expect(mockEventsWatch).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: expect.objectContaining({
        type: "web_hook",
        token: "user_1",
        address: "https://example.ngrok.io/api/webhooks/google",
        expiration: expect.any(String),
      }),
    });
    expect(db.insert).toHaveBeenCalled();
  });

  it("uses a UUID as the channel id", async () => {
    mockEventsWatch.mockResolvedValueOnce({
      data: { resourceId: "res-123", expiration: "1700000000000" },
    });
    (db.insert as Mock).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await setupWatchChannel("user_1");

    const callArg = (mockEventsWatch as Mock).mock.calls[0][0];
    expect(callArg.requestBody.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("stopWatchChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFreshGoogleAccessToken as Mock).mockResolvedValue("mock-access-token");
  });

  it("does nothing if no sync state exists for user", async () => {
    mockSelect([]);

    await expect(stopWatchChannel("user_1")).resolves.not.toThrow();
    expect(mockChannelsStop).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("calls channels.stop and deletes the sync state row", async () => {
    mockSelect([{ channelId: "ch-uuid", resourceId: "res-uuid" }]);
    mockChannelsStop.mockResolvedValueOnce({});
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await stopWatchChannel("user_1");

    expect(mockChannelsStop).toHaveBeenCalledWith({
      requestBody: { id: "ch-uuid", resourceId: "res-uuid" },
    });
    expect(db.delete).toHaveBeenCalled();
  });

  it("still deletes sync state row even if channels.stop throws", async () => {
    mockSelect([{ channelId: "ch-uuid", resourceId: "res-uuid" }]);
    mockChannelsStop.mockRejectedValueOnce(new Error("Channel not found"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});
    (db.delete as Mock).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await expect(stopWatchChannel("user_1")).resolves.not.toThrow();
    expect(db.delete).toHaveBeenCalled();
  });
});
