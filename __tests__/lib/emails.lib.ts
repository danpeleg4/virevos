import { getEmailData, getRecentEmails } from "@/lib/emails";
import { currentUser } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@db/schema", () => ({
  outlookEmails: {
    outlookId: "outlook_id",
    subject: "subject",
    fromEmail: "from_email",
    fromName: "from_name",
    sentAt: "sent_at",
    isSent: "is_sent",
    snippet: "snippet",
    bodyText: "body_text",
    bodyHtml: "body_html",
    userId: "user_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ __op: "and", args }),
  desc: (col: unknown) => ({ __op: "desc", col }),
  eq: (col: unknown, val: unknown) => ({ __op: "eq", col, val }),
  inArray: (col: unknown, vals: unknown) => ({ __op: "inArray", col, vals }),
}));

// var so the mock factory below can capture them (factories run before const
// declarations are hoisted)
/* eslint-disable no-var */
var mockQueryVectors: Mock;
var mockCreateEmbedding: Mock;
/* eslint-enable no-var */

vi.mock("@/lib/embeddings", () => {
  mockQueryVectors = vi.fn();
  mockCreateEmbedding = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
  return {
    EMAILS_BUCKET: "emails",
    EMAILS_INDEX: "emails",
    createEmbedding: mockCreateEmbedding,
    supabaseVector: {
      storage: {
        vectors: {
          from: () => ({ index: () => ({ queryVectors: mockQueryVectors }) }),
        },
      },
    },
  };
});

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockLimit = vi.fn();
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
const mockWhereChain = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockFromChain = vi.fn(() => ({ where: mockWhereChain }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "@db/db";

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockWhere.mockResolvedValue([]);
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });

  mockLimit.mockResolvedValue([]);
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockWhereChain.mockReturnValue({ orderBy: mockOrderBy });
  mockFromChain.mockReturnValue({ where: mockWhereChain });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getEmailData ──────────────────────────────────────────────────────────

describe("getEmailData", () => {
  it("returns [] when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    expect(await getEmailData("query")).toEqual([]);
    expect(mockCreateEmbedding).not.toHaveBeenCalled();
  });

  it("calls queryVectors scoped to the current user_id and topK=10", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({ data: { vectors: [] } });
    (db.select as Mock).mockReturnValue({ from: mockFrom });
    await getEmailData("Acme contract");
    expect(mockCreateEmbedding).toHaveBeenCalledWith("Acme contract");
    expect(mockQueryVectors).toHaveBeenCalledWith({
      queryVector: { float32: [0.1, 0.2, 0.3] },
      topK: 10,
      filter: { user_id: "user_1" },
      returnMetadata: true,
    });
  });

  it("returns [] and logs when queryVectors returns an error", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      error: { message: "boom" },
    });
    expect(await getEmailData("query")).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("returns [] when no vectors come back", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({ data: { vectors: [] } });
    expect(await getEmailData("query")).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("enriches each hit with DB row data when present, preserving rank order", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      data: {
        vectors: [
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
        ],
      },
    });

    (db.select as Mock).mockReturnValue({ from: mockFrom });
    mockWhere.mockResolvedValueOnce([
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

    const result = await getEmailData("query");
    expect(result.map((r) => r.outlookId)).toEqual(["msg-A", "msg-B"]);
    expect(result[0].subject).toBe("DB subject A");
    expect(result[0].fromName).toBe("Alice");
    expect(result[0].sentAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("falls back to vector metadata when the DB row is missing", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      data: {
        vectors: [
          {
            metadata: {
              outlook_id: "msg-ghost",
              subject: "Ghost subject",
              from_email: "ghost@example.com",
              sent_at: "2026-03-01T00:00:00.000Z",
              is_sent: true,
            },
          },
        ],
      },
    });
    (db.select as Mock).mockReturnValue({ from: mockFrom });
    mockWhere.mockResolvedValueOnce([]); // no DB rows

    const result = await getEmailData("query");
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
    (currentUser as Mock).mockResolvedValue(mockUser);
    mockQueryVectors.mockResolvedValueOnce({
      data: {
        vectors: [
          { metadata: { subject: "no id" } },
          { metadata: { outlook_id: "msg-1", subject: "ok" } },
        ],
      },
    });
    (db.select as Mock).mockReturnValue({ from: mockFrom });
    mockWhere.mockResolvedValueOnce([]);

    const result = await getEmailData("query");
    expect(result.map((r) => r.outlookId)).toEqual(["msg-1"]);
  });

  it("throws ValidationError when text is empty", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await expect(getEmailData("")).rejects.toThrow();
  });
});

// ─── getRecentEmails ───────────────────────────────────────────────────────

describe("getRecentEmails", () => {
  it("returns [] when unauthenticated", async () => {
    (currentUser as Mock).mockResolvedValue(null);
    expect(await getRecentEmails(5)).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("clamps limit to 25 when caller asks for more", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([]);
    await getRecentEmails(500);
    expect(mockLimit).toHaveBeenCalledWith(25);
  });

  it("clamps limit to 1 when caller asks for less", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([]);
    await getRecentEmails(0);
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("throws ValidationError when limit is not a number", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      getRecentEmails("five" as unknown as number)
    ).rejects.toThrow();
  });

  it("uses bodyText when present, truncated only above 1500 chars", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([
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

    const result = await getRecentEmails(5);
    expect(result[0].body).toBe("short body");
  });

  it("strips HTML when bodyText is null and bodyHtml is present", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([
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

    const result = await getRecentEmails(5);
    expect(result[0].body).toBe("Hello world");
  });

  it("truncates body at 1500 chars and appends an ellipsis", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    const longBody = "a".repeat(2000);
    mockLimit.mockResolvedValueOnce([
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

    const result = await getRecentEmails(5);
    expect(result[0].body).toBe("a".repeat(1500) + "…");
  });

  it("returns body=null when both bodyText and bodyHtml are null", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([
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

    const result = await getRecentEmails(5);
    expect(result[0].body).toBeNull();
  });

  it("maps sentAt to ISO string and isSent to a boolean", async () => {
    (currentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockReturnValue({ from: mockFromChain });
    mockLimit.mockResolvedValueOnce([
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

    const result = await getRecentEmails(5);
    expect(result[0].sentAt).toBe("2026-04-05T12:34:56.000Z");
    expect(result[0].isSent).toBe(false);
  });
});
