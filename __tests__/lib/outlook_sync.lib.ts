const mockGetFreshOutlookAccessToken = vi.fn();
vi.mock("@/lib/outlook/outlook_access", () => ({
  getFreshOutlookAccessToken: (...args: unknown[]) =>
    mockGetFreshOutlookAccessToken(...args),
}));

const mockCreateEmbeddings = vi.fn();
vi.mock("@/lib/embeddings", () => ({
  createEmbeddings: (...args: unknown[]) => mockCreateEmbeddings(...args),
  EMAILS_BUCKET: "emails",
  EMAILS_INDEX: "emails",
}));

import {
  parseGraphDateTime,
  performFullSync,
  performIncrementalSync,
  removeSubscriptions,
  renewSubscriptions,
  setupSubscriptions,
} from "@/lib/outlook/outlook_sync";
import {
  makeFakeOutlookDb,
  canonicalOutlookSyncState,
} from "../fakes/fake_outlook_db";
import { makeFakeCalendarDb } from "../fakes/fake_calendar_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";
import { makeFakeGraphMailService } from "../fakes/fake_graph_mail_service";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakeOpenAIClient } from "../fakes/fake_openai_client";

const outlookDb = makeFakeOutlookDb();
const calendarDb = makeFakeCalendarDb();
const graphAuthService = makeFakeGraphAuthService();
const graphMailService = makeFakeGraphMailService();
const storage = makeFakeStorageClient();
const openaiClient = makeFakeOpenAIClient();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockGetFreshOutlookAccessToken.mockResolvedValue("token-123");
  mockCreateEmbeddings.mockResolvedValue([[0.1, 0.2]]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("parseGraphDateTime", () => {
  it("parses Graph's tz-less dateTime as UTC (not local)", () => {
    const result = parseGraphDateTime({
      dateTime: "2026-04-25T19:00:00.0000000",
      timeZone: "UTC",
    });
    expect(result.getTime()).toBe(new Date("2026-04-25T19:00:00Z").getTime());
  });

  it("preserves the UTC instant regardless of fractional seconds format", () => {
    const result = parseGraphDateTime({
      dateTime: "2026-01-15T08:30:45.1234567",
      timeZone: "UTC",
    });
    expect(result.toISOString()).toBe("2026-01-15T08:30:45.123Z");
  });

  it("does not shift by the host timezone offset", () => {
    // Regardless of where the test runs, the parsed instant must equal the
    // UTC moment encoded in the string. If we accidentally parsed as local,
    // the millisecond value would differ by getTimezoneOffset().
    // getTimezoneOffset returns (UTC - local) in minutes, so parsing the
    // same string as local produces an instant that is (offset * 60_000)
    // ms LATER than the UTC-parsed instant.
    const dateTime = "2026-07-04T12:00:00.0000000";
    const parsed = parseGraphDateTime({ dateTime, timeZone: "UTC" });
    const local = new Date(dateTime);
    const expectedDeltaMs = -local.getTimezoneOffset() * 60_000 || 0;
    expect(parsed.getTime() - local.getTime()).toBe(expectedDeltaMs);
  });
});

const sync = (
  fn: typeof performFullSync | typeof performIncrementalSync,
  userId = "user_1"
) =>
  fn(
    userId,
    outlookDb,
    calendarDb,
    graphAuthService,
    graphMailService,
    storage,
    openaiClient
  );

describe("performFullSync", () => {
  it("throws when there is no Outlook token", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce(null);
    await expect(sync(performFullSync)).rejects.toThrow(
      "No Outlook token for user user_1"
    );
  });

  it("inserts a new calendar event returned by the delta feed", async () => {
    graphMailService.fetchDelta
      .mockResolvedValueOnce({
        value: [
          {
            id: "evt-new",
            subject: "Kickoff",
            start: { dateTime: "2026-08-01T10:00:00.0000000", timeZone: "UTC" },
            end: { dateTime: "2026-08-01T10:30:00.0000000", timeZone: "UTC" },
          },
        ],
        "@odata.deltaLink": "https://graph/delta-cal-2",
      })
      .mockResolvedValueOnce({ value: [] })
      .mockResolvedValueOnce({ value: [] });
    calendarDb.getEventsForUser.mockResolvedValueOnce([]);

    await sync(performFullSync);

    expect(calendarDb.insertEvents).toHaveBeenCalledWith([
      expect.objectContaining({ id: "evt-new", title: "Kickoff" }),
    ]);
  });

  it("removes DB events with an outlookEventId that Graph no longer returns", async () => {
    graphMailService.fetchDelta
      .mockResolvedValueOnce({ value: [] })
      .mockResolvedValueOnce({ value: [] })
      .mockResolvedValueOnce({ value: [] });
    calendarDb.getEventsForUser.mockResolvedValueOnce([
      {
        id: "evt-stale",
        origin: "outlook_calendar",
        outlookEventId: "outlook-evt-stale",
        title: "Gone",
        description: null,
        dateTime: new Date(),
        duration: 30,
        status: "confirmed",
        userId: "user_1",
      },
    ]);

    await sync(performFullSync);

    expect(calendarDb.deleteEvent).toHaveBeenCalledWith("evt-stale", "user_1");
  });

  it("filters out inbox/sent messages older than the 60-day cutoff", async () => {
    const oldMessage = {
      id: "msg-old",
      subject: "Ancient",
      receivedDateTime: new Date(
        Date.now() - 90 * 24 * 3600 * 1000
      ).toISOString(),
    };
    graphMailService.fetchDelta
      .mockResolvedValueOnce({ value: [] }) // calendar
      .mockResolvedValueOnce({ value: [oldMessage] }) // inbox
      .mockResolvedValueOnce({ value: [] }); // sent
    outlookDb.getExistingEmailsForUser.mockResolvedValue([]);

    await sync(performFullSync);

    expect(outlookDb.insertEmails).not.toHaveBeenCalled();
  });

  it("persists the delta links returned by each feed", async () => {
    graphMailService.fetchDelta
      .mockResolvedValueOnce({ value: [], "@odata.deltaLink": "cal-delta" })
      .mockResolvedValueOnce({ value: [], "@odata.deltaLink": "inbox-delta" })
      .mockResolvedValueOnce({ value: [], "@odata.deltaLink": "sent-delta" });

    await sync(performFullSync);

    expect(outlookDb.upsertDeltaLinks).toHaveBeenCalledWith("user_1", {
      calendarDeltaLink: "cal-delta",
      emailDeltaLink: "inbox-delta",
      sentEmailDeltaLink: "sent-delta",
    });
  });

  it("embeds new emails via the vector store", async () => {
    graphMailService.fetchDelta
      .mockResolvedValueOnce({ value: [] })
      .mockResolvedValueOnce({
        value: [
          {
            id: "msg-new",
            subject: "Hi",
            body: { contentType: "text", content: "Hello there" },
            receivedDateTime: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({ value: [] });
    outlookDb.getExistingEmailsForUser.mockResolvedValue([]);

    await sync(performFullSync);

    expect(mockCreateEmbeddings).toHaveBeenCalled();
    expect(storage.putVectors).toHaveBeenCalledWith(
      "emails",
      "emails",
      expect.arrayContaining([
        expect.objectContaining({ key: "user_1/msg-new" }),
      ])
    );
  });
});

describe("performIncrementalSync", () => {
  it("falls back to a full sync when there is no prior sync state", async () => {
    outlookDb.getSyncState.mockResolvedValueOnce([]);
    graphMailService.fetchDelta.mockResolvedValue({ value: [] });

    await sync(performIncrementalSync);

    // full sync hits the well-known calendarView/inbox/sentitems delta URLs
    const urls: string[] = graphMailService.fetchDelta.mock.calls.map(
      (c: unknown[]) => c[1] as string
    );
    expect(urls.some((u: string) => u.includes("/me/calendarView/delta"))).toBe(
      true
    );
  });

  it("throws when there is no Outlook token and prior links exist", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce(null);
    await expect(sync(performIncrementalSync)).rejects.toThrow(
      "No Outlook token for user user_1"
    );
  });

  it("fetches each existing delta link and persists the refreshed links", async () => {
    graphMailService.fetchDelta.mockResolvedValue({
      value: [],
      "@odata.deltaLink": "new-link",
    });

    await sync(performIncrementalSync);

    expect(outlookDb.updateDeltaLinks).toHaveBeenCalledWith("user_1", {
      calendarDeltaLink: "new-link",
      emailDeltaLink: "new-link",
      sentEmailDeltaLink: "new-link",
    });
  });

  it("falls back to a full sync when the calendar delta link is expired (410)", async () => {
    graphMailService.fetchDelta.mockRejectedValueOnce({
      response: { status: 410 },
    });
    graphMailService.fetchDelta.mockResolvedValue({ value: [] });

    await sync(performIncrementalSync);

    // fetchDelta called again for the full-sync calendar/inbox/sent fetches
    expect(graphMailService.fetchDelta.mock.calls.length).toBeGreaterThan(1);
  });

  it("clears (rather than fully re-syncs) the email delta link on a 410", async () => {
    graphMailService.fetchDelta
      .mockResolvedValueOnce({ value: [], "@odata.deltaLink": "cal-2" }) // calendar ok
      .mockRejectedValueOnce({ response: { status: 410 } }) // inbox 410
      .mockResolvedValueOnce({ value: [], "@odata.deltaLink": "sent-2" }); // sent ok

    await sync(performIncrementalSync);

    expect(outlookDb.updateDeltaLinks).toHaveBeenCalledWith("user_1", {
      calendarDeltaLink: "cal-2",
      emailDeltaLink: null,
      sentEmailDeltaLink: "sent-2",
    });
  });

  it("rethrows non-410 errors from the calendar delta fetch", async () => {
    graphMailService.fetchDelta.mockRejectedValueOnce(new Error("graph down"));

    await expect(sync(performIncrementalSync)).rejects.toThrow("graph down");
  });
});

describe("setupSubscriptions", () => {
  const setup = () =>
    setupSubscriptions("user_1", outlookDb, graphAuthService, graphMailService);

  it("throws when there is no Outlook token", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce(null);
    await expect(setup()).rejects.toThrow("No Outlook token for user user_1");
  });

  it("creates calendar and email subscriptions and persists both ids", async () => {
    graphMailService.createSubscription
      .mockResolvedValueOnce({ id: "sub-cal", expirationDateTime: "x" })
      .mockResolvedValueOnce({ id: "sub-mail", expirationDateTime: "x" });

    await setup();

    expect(outlookDb.upsertSubscriptions).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        calendarSubscriptionId: "sub-cal",
        emailSubscriptionId: "sub-mail",
      })
    );
  });

  it("persists a null calendar subscription id when creation fails", async () => {
    graphMailService.createSubscription
      .mockRejectedValueOnce(new Error("graph down"))
      .mockResolvedValueOnce({ id: "sub-mail", expirationDateTime: "x" });

    await setup();

    expect(outlookDb.upsertSubscriptions).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        calendarSubscriptionId: null,
        emailSubscriptionId: "sub-mail",
      })
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("renewSubscriptions", () => {
  const renew = () =>
    renewSubscriptions("user_1", outlookDb, graphAuthService, graphMailService);

  it("returns early when there is no Outlook token", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce(null);
    await renew();
    expect(outlookDb.getSyncState).not.toHaveBeenCalled();
  });

  it("returns early when there is no sync state", async () => {
    outlookDb.getSyncState.mockResolvedValueOnce([]);
    await renew();
    expect(graphMailService.renewSubscription).not.toHaveBeenCalled();
  });

  it("renews both subscriptions and updates the expiration", async () => {
    await renew();

    expect(graphMailService.renewSubscription).toHaveBeenCalledWith(
      "token-123",
      canonicalOutlookSyncState.calendarSubscriptionId,
      expect.any(String)
    );
    expect(outlookDb.updateSubscriptionExpiration).toHaveBeenCalledWith(
      "user_1",
      expect.any(Number)
    );
  });

  it("re-creates subscriptions when a renewal fails", async () => {
    graphMailService.renewSubscription.mockRejectedValueOnce(
      new Error("expired")
    );

    await renew();

    expect(outlookDb.upsertSubscriptions).toHaveBeenCalled();
    expect(outlookDb.updateSubscriptionExpiration).not.toHaveBeenCalled();
  });
});

describe("removeSubscriptions", () => {
  const remove = () =>
    removeSubscriptions(
      "user_1",
      outlookDb,
      graphAuthService,
      graphMailService
    );

  it("returns early when there is no sync state", async () => {
    outlookDb.getSyncState.mockResolvedValueOnce([]);
    await remove();
    expect(graphMailService.deleteSubscription).not.toHaveBeenCalled();
  });

  it("deletes both subscriptions when a token is available", async () => {
    await remove();

    expect(graphMailService.deleteSubscription).toHaveBeenCalledWith(
      "token-123",
      canonicalOutlookSyncState.calendarSubscriptionId
    );
    expect(graphMailService.deleteSubscription).toHaveBeenCalledWith(
      "token-123",
      canonicalOutlookSyncState.emailSubscriptionId
    );
  });

  it("skips Graph calls when there is no token", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValueOnce(null);
    await remove();
    expect(graphMailService.deleteSubscription).not.toHaveBeenCalled();
  });

  it("logs and continues when a delete call fails", async () => {
    graphMailService.deleteSubscription.mockRejectedValueOnce(
      new Error("graph down")
    );

    await expect(remove()).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
