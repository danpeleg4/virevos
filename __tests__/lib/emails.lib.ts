import { getEmailData, getRecentEmails } from "@/lib/emails";
import { getCurrentUser } from "@/lib/supabase/auth";
import { makeFakeEmailsDb } from "../fakes/fake_emails_db";
import { makeFakeOpenAIClient } from "../fakes/fake_openai_client";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const emailsDb = makeFakeEmailsDb();
const openaiClient = makeFakeOpenAIClient();
const storage = makeFakeStorageClient();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getEmailData ──────────────────────────────────────────────────────────

describe("getEmailData", () => {
  it("returns [] when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    expect(
      await getEmailData("query", emailsDb, openaiClient, storage)
    ).toEqual([]);
    expect(openaiClient.createEmbedding).not.toHaveBeenCalled();
  });

  it("calls queryVectors scoped to the current userId and topK=10", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    storage.queryVectors.mockResolvedValueOnce([]);
    openaiClient.createEmbedding.mockResolvedValueOnce([0.1, 0.2, 0.3]);

    await getEmailData("Acme contract", emailsDb, openaiClient, storage);

    expect(openaiClient.createEmbedding).toHaveBeenCalledWith("Acme contract");
    expect(storage.queryVectors).toHaveBeenCalledWith("emails", "emails", {
      queryVector: { float32: [0.1, 0.2, 0.3] },
      topK: 10,
      filter: { userId: "user_1" },
      returnMetadata: true,
    });
  });

  it("returns [] when no vectors come back", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    storage.queryVectors.mockResolvedValueOnce([]);
    expect(
      await getEmailData("query", emailsDb, openaiClient, storage)
    ).toEqual([]);
    expect(emailsDb.getEmailsByOutlookIds).not.toHaveBeenCalled();
  });

  it("enriches each hit with DB row data when present, preserving rank order", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    storage.queryVectors.mockResolvedValueOnce([
      {
        metadata: {
          outlook_id: "msg-A",
          subject: "vector-subject-A",
          from_email: "v@example.com",
          sent_at: "2026-01-01T00:00:00.000Z",
          is_sent: false,
        },
      },
      {
        metadata: {
          outlook_id: "msg-B",
          subject: "vector-subject-B",
          from_email: "v@example.com",
          sent_at: "2026-01-02T00:00:00.000Z",
          is_sent: false,
        },
      },
    ]);

    emailsDb.getEmailsByOutlookIds.mockResolvedValueOnce([
      {
        outlookId: "msg-B",
        subject: "DB subject B",
        fromEmail: "b@example.com",
        fromName: "Bob",
        sentAt: new Date("2026-02-02T00:00:00.000Z"),
        isSent: false,
        snippet: "snippet B",
      },
      {
        outlookId: "msg-A",
        subject: "DB subject A",
        fromEmail: "a@example.com",
        fromName: "Alice",
        sentAt: new Date("2026-02-01T00:00:00.000Z"),
        isSent: false,
        snippet: "snippet A",
      },
    ]);

    const result = await getEmailData("query", emailsDb, openaiClient, storage);
    expect(result.map((r) => r.outlookId)).toEqual(["msg-A", "msg-B"]);
    expect(result[0].subject).toBe("DB subject A");
    expect(result[0].fromName).toBe("Alice");
    expect(result[0].sentAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("falls back to vector metadata when the DB row is missing", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    storage.queryVectors.mockResolvedValueOnce([
      {
        metadata: {
          outlook_id: "msg-ghost",
          subject: "Ghost subject",
          from_email: "ghost@example.com",
          sent_at: "2026-03-01T00:00:00.000Z",
          is_sent: true,
        },
      },
    ]);
    emailsDb.getEmailsByOutlookIds.mockResolvedValueOnce([]); // no DB rows

    const result = await getEmailData("query", emailsDb, openaiClient, storage);
    expect(result).toEqual([
      {
        outlookId: "msg-ghost",
        subject: "Ghost subject",
        fromEmail: "ghost@example.com",
        fromName: null,
        sentAt: "2026-03-01T00:00:00.000Z",
        isSent: true,
        snippet: null,
      },
    ]);
  });

  it("skips vectors whose metadata has no outlook_id", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    storage.queryVectors.mockResolvedValueOnce([
      { metadata: { subject: "no id" } },
      { metadata: { outlook_id: "msg-1", subject: "ok" } },
    ]);
    emailsDb.getEmailsByOutlookIds.mockResolvedValueOnce([]);

    const result = await getEmailData("query", emailsDb, openaiClient, storage);
    expect(result.map((r) => r.outlookId)).toEqual(["msg-1"]);
  });

  it("throws ValidationError when text is empty", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      getEmailData("", emailsDb, openaiClient, storage)
    ).rejects.toThrow();
  });
});

// ─── getRecentEmails ───────────────────────────────────────────────────────

describe("getRecentEmails", () => {
  it("returns [] when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    expect(await getRecentEmails(5, emailsDb)).toEqual([]);
    expect(emailsDb.getRecentUnsentEmails).not.toHaveBeenCalled();
  });

  it("clamps limit to 25 when caller asks for more", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([]);
    await getRecentEmails(500, emailsDb);
    expect(emailsDb.getRecentUnsentEmails).toHaveBeenCalledWith("user_1", 25);
  });

  it("clamps limit to 1 when caller asks for less", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([]);
    await getRecentEmails(0, emailsDb);
    expect(emailsDb.getRecentUnsentEmails).toHaveBeenCalledWith("user_1", 1);
  });

  it("throws ValidationError when limit is not a number", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      getRecentEmails("five" as unknown as number, emailsDb)
    ).rejects.toThrow();
  });

  it("uses bodyText when present, truncated only above 1500 chars", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([
      {
        outlookId: "msg-1",
        subject: "S",
        fromEmail: "x@y.com",
        fromName: "X",
        sentAt: new Date("2026-04-01T00:00:00.000Z"),
        isSent: false,
        snippet: "snip",
        bodyText: "short body",
        bodyHtml: null,
      },
    ]);

    const result = await getRecentEmails(5, emailsDb);
    expect(result[0].body).toBe("short body");
  });

  it("strips HTML when bodyText is null and bodyHtml is present", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([
      {
        outlookId: "msg-2",
        subject: "S",
        fromEmail: "x@y.com",
        fromName: "X",
        sentAt: new Date("2026-04-02T00:00:00.000Z"),
        isSent: false,
        snippet: null,
        bodyText: null,
        bodyHtml: "<p>Hello <b>world</b></p>",
      },
    ]);

    const result = await getRecentEmails(5, emailsDb);
    expect(result[0].body).toBe("Hello world");
  });

  it("truncates body at 1500 chars and appends an ellipsis", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const longBody = "a".repeat(2000);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([
      {
        outlookId: "msg-3",
        subject: "S",
        fromEmail: "x@y.com",
        fromName: "X",
        sentAt: new Date("2026-04-03T00:00:00.000Z"),
        isSent: false,
        snippet: null,
        bodyText: longBody,
        bodyHtml: null,
      },
    ]);

    const result = await getRecentEmails(5, emailsDb);
    expect(result[0].body).toBe("a".repeat(1500) + "…");
  });

  it("returns body=null when both bodyText and bodyHtml are null", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([
      {
        outlookId: "msg-4",
        subject: "S",
        fromEmail: "x@y.com",
        fromName: "X",
        sentAt: new Date("2026-04-04T00:00:00.000Z"),
        isSent: false,
        snippet: null,
        bodyText: null,
        bodyHtml: null,
      },
    ]);

    const result = await getRecentEmails(5, emailsDb);
    expect(result[0].body).toBeNull();
  });

  it("maps sentAt to ISO string and isSent to a boolean", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    emailsDb.getRecentUnsentEmails.mockResolvedValueOnce([
      {
        outlookId: "msg-5",
        subject: "S",
        fromEmail: "x@y.com",
        fromName: "X",
        sentAt: new Date("2026-04-05T12:34:56.000Z"),
        isSent: null,
        snippet: null,
        bodyText: "body",
        bodyHtml: null,
      },
    ]);

    const result = await getRecentEmails(5, emailsDb);
    expect(result[0].sentAt).toBe("2026-04-05T12:34:56.000Z");
    expect(result[0].isSent).toBe(false);
  });
});
