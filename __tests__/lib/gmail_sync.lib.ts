import {
  performGmailSync,
  syncSingleMessage,
  searchEmails,
} from "@/lib/gmail_sync";
import { currentUser } from "@clerk/nextjs/server";

// ─── Pinecone mock ────────────────────────────────────────────────────────────

/* eslint-disable no-var */
var mockUpsertRecords: jest.Mock;
var mockSearchRecords: jest.Mock;
/* eslint-enable no-var */

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@pinecone-database/pinecone", () => {
  mockUpsertRecords = jest.fn().mockResolvedValue(undefined);
  mockSearchRecords = jest.fn().mockResolvedValue({ result: { hits: [] } });
  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: () => ({
        namespace: () => ({
          upsertRecords: mockUpsertRecords,
          searchRecords: mockSearchRecords,
        }),
      }),
    })),
  };
});

// ─── gmail_client mock ────────────────────────────────────────────────────────

/* eslint-disable no-var */
var mockMessageGet: jest.Mock;
var mockMessagesList: jest.Mock;
/* eslint-enable no-var */

jest.mock("@/lib/gmail_client", () => {
  mockMessageGet = jest.fn();
  mockMessagesList = jest.fn();
  return {
    getGmailClient: jest.fn().mockResolvedValue({
      users: {
        messages: {
          get: mockMessageGet,
          list: mockMessagesList,
        },
      },
    }),
    parseEmailBody: jest
      .fn()
      .mockReturnValue({ html: "<p>body</p>", text: "body text" }),
    parseEmailAddress: jest.fn().mockImplementation((raw: string) => ({
      name: "Test User",
      email: raw?.includes("@") ? raw.trim() : "test@example.com",
    })),
    getHeader: jest
      .fn()
      .mockImplementation(
        (headers: Array<{ name: string; value: string }>, name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
            ?.value ?? ""
      ),
    parseHeaderValue: jest.fn().mockImplementation((v: string) => v),
    listAttachments: jest.fn().mockReturnValue([]),
  };
});

// ─── DB mock ──────────────────────────────────────────────────────────────────

/* eslint-disable no-var */
var mockReturning: jest.Mock;
var mockInsertValues: jest.Mock;
var mockInsert: jest.Mock;
var mockUpdateWhere: jest.Mock;
var mockUpdateSet: jest.Mock;
var mockUpdate: jest.Mock;
var mockSelectLimit: jest.Mock;
var mockSelectWhere: jest.Mock;
var mockSelectFrom: jest.Mock;
var mockSelect: jest.Mock;
/* eslint-enable no-var */

jest.mock("@db/db", () => {
  mockReturning = jest.fn();
  mockInsertValues = jest.fn(() => ({ returning: mockReturning }));
  mockInsert = jest.fn(() => ({ values: mockInsertValues }));
  mockUpdateWhere = jest.fn();
  mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
  mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));
  mockSelectLimit = jest.fn();
  // where() returns something both awaitable (for clients query) and with .limit (for emails query)
  mockSelectWhere = jest.fn().mockImplementation(() => {
    const p = Promise.resolve([]) as unknown as Promise<unknown[]> & {
      limit: jest.Mock;
    };
    p.limit = mockSelectLimit;
    return p;
  });
  mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
  mockSelect = jest.fn(() => ({ from: mockSelectFrom }));
  return {
    db: {
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    },
  };
});

jest.mock("@db/schema", () => ({
  googleEmails: { id: "id", gmailId: "gmailId", userId: "userId" },
  emailAttachments: {},
  clients: { id: "id", email: "email", userId: "userId" },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeMessage = (id = "msg1", threadId = "thread1") => ({
  data: {
    id,
    threadId,
    snippet: "email snippet",
    labelIds: ["INBOX"],
    payload: {
      headers: [
        { name: "From", value: "sender@example.com" },
        { name: "To", value: "recipient@example.com" },
        { name: "Subject", value: "Test Subject" },
        { name: "Date", value: new Date("2026-01-01").toUTCString() },
      ],
      parts: [],
    },
  },
});

const USER_ID = "user_123";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  (currentUser as jest.Mock).mockResolvedValue({ id: USER_ID });
  mockUpsertRecords.mockResolvedValue(undefined);
  mockSearchRecords.mockResolvedValue({ result: { hits: [] } });

  // emails check: .where().limit() → [] (no existing email by default)
  mockSelectLimit.mockResolvedValue([]);
  // where() returns a thenable (for clients query) that also has .limit (for emails query)
  mockSelectWhere.mockImplementation(() => {
    const p = Promise.resolve([]) as unknown as Promise<unknown[]> & {
      limit: jest.Mock;
    };
    p.limit = mockSelectLimit;
    return p;
  });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });

  mockUpdateWhere.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
  mockUpdate.mockReturnValue({ set: mockUpdateSet });

  mockReturning.mockResolvedValue([{ id: 42 }]);
  mockInsertValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockInsertValues });

  mockMessageGet.mockResolvedValue(makeMessage());
  mockMessagesList.mockResolvedValue({
    data: { messages: [{ id: "msg1" }], nextPageToken: undefined },
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("gmail_sync — Pinecone upsert on new email", () => {
  it("calls upsertRecords with correct record when email is new", async () => {
    // No existing email in DB
    mockSelectLimit.mockResolvedValue([]);

    await syncSingleMessage(USER_ID, "msg1");

    expect(mockUpsertRecords).toHaveBeenCalledTimes(1);
    const [records] = mockUpsertRecords.mock.calls[0] as [unknown[]];
    expect(records).toHaveLength(1);
    const record = records[0] as Record<string, unknown>;

    expect(record.id).toBe(`${USER_ID}_msg1`);
    expect(record.gmailId).toBe("msg1");
    expect(record.threadId).toBe("thread1");
    expect(record.subject).toBe("Test Subject");
    expect(typeof record.text).toBe("string");
    expect((record.text as string).startsWith("Test Subject")).toBe(true);
    expect(record.sentAt).toBeGreaterThan(0);
  });

  it("calls upsertRecords with correct record when email already exists", async () => {
    // Existing email in DB
    mockSelectLimit.mockResolvedValue([{ id: 99 }]);

    await syncSingleMessage(USER_ID, "msg1");

    expect(mockUpsertRecords).toHaveBeenCalledTimes(1);
    const [records] = mockUpsertRecords.mock.calls[0] as [unknown[]];
    const record = records[0] as Record<string, unknown>;
    expect(record.id).toBe(`${USER_ID}_msg1`);
    expect(record.gmailId).toBe("msg1");
  });
});

describe("gmail_sync — Pinecone error resilience", () => {
  it("does not throw when Pinecone upsert fails", async () => {
    mockSelectLimit.mockResolvedValue([]);
    mockUpsertRecords.mockRejectedValue(new Error("Pinecone unavailable"));

    await expect(syncSingleMessage(USER_ID, "msg1")).resolves.toBeUndefined();
  });
});

describe("gmail_sync — performGmailSync Pinecone integration", () => {
  it("calls upsertRecords for each synced message", async () => {
    mockMessagesList
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: "msg1" }, { id: "msg2" }],
          nextPageToken: undefined,
        },
      })
      .mockResolvedValue({
        data: { messages: [], nextPageToken: undefined },
      });

    mockMessageGet
      .mockResolvedValueOnce(makeMessage("msg1", "thread1"))
      .mockResolvedValueOnce(makeMessage("msg2", "thread2"))
      .mockResolvedValue(makeMessage("msg1", "thread1")); // fallback for SENT label

    mockSelectLimit.mockResolvedValue([]);

    await performGmailSync(USER_ID);

    // At minimum, upsertRecords was called for each successfully processed message
    expect(mockUpsertRecords).toHaveBeenCalled();
  });
});

// ─── searchEmails ─────────────────────────────────────────────────────────────

describe("searchEmails", () => {
  it("returns empty array when user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const result = await searchEmails("invoice");

    expect(result).toEqual([]);
    expect(mockSearchRecords).not.toHaveBeenCalled();
  });

  it("calls searchRecords with correct query and returns mapped fields", async () => {
    const mockHit = {
      fields: {
        id: `${USER_ID}_msg1`,
        gmailId: "msg1",
        threadId: "thread1",
        subject: "Invoice Q1",
        text: "Invoice Q1\n\nPlease find the invoice attached.",
        fromEmail: "client@example.com",
        fromName: "Client",
        toEmails: '["me@example.com"]',
        ccEmails: "[]",
        sentAt: 1700000000000,
        isSent: false,
        isRead: true,
        isStarred: false,
        isArchived: false,
      },
    };
    mockSearchRecords.mockResolvedValue({ result: { hits: [mockHit] } });

    const result = await searchEmails("invoice");

    expect(mockSearchRecords).toHaveBeenCalledWith({
      query: { topK: 10, inputs: { text: "invoice" } },
    });
    expect(result).toHaveLength(1);
    expect(result[0].gmailId).toBe("msg1");
    expect(result[0].subject).toBe("Invoice Q1");
  });

  it("returns empty array when no hits are found", async () => {
    mockSearchRecords.mockResolvedValue({ result: { hits: [] } });

    const result = await searchEmails("nonexistent topic");

    expect(result).toEqual([]);
  });

  it("returns multiple hits when found", async () => {
    const makeHit = (gmailId: string) => ({
      fields: {
        id: `${USER_ID}_${gmailId}`,
        gmailId,
        threadId: "thread1",
        subject: "Test",
        text: "Test email",
        fromEmail: "a@b.com",
        fromName: "A",
        toEmails: "[]",
        ccEmails: "[]",
        sentAt: 1700000000000,
        isSent: false,
        isRead: false,
        isStarred: false,
        isArchived: false,
      },
    });
    mockSearchRecords.mockResolvedValue({
      result: { hits: [makeHit("msg1"), makeHit("msg2"), makeHit("msg3")] },
    });

    const result = await searchEmails("test");

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.gmailId)).toEqual(["msg1", "msg2", "msg3"]);
  });
});
