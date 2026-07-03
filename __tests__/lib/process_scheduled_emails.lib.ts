const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockGetFreshOutlookAccessToken = vi.fn();

vi.mock("axios", () => {
  const axios = {
    get: (...args: unknown[]) => mockAxiosGet(...args),
    post: (...args: unknown[]) => mockAxiosPost(...args),
    isAxiosError: (e: unknown) =>
      !!(e as { isAxiosError?: boolean })?.isAxiosError,
  };
  return { default: axios, ...axios };
});

vi.mock("@/lib/outlook/outlook_access", () => ({
  getFreshOutlookAccessToken: (...args: unknown[]) =>
    mockGetFreshOutlookAccessToken(...args),
}));

vi.mock("@db/schema", () => ({
  scheduledEmails: { id: "id" },
  users: { userId: "user_id", name: "name" },
  clients: { id: "id", email: "email", userId: "user_id" },
  outlookEmails: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  lte: vi.fn(),
}));

// Each db.select() consumes the next queued result; where() is awaitable
// directly (clients query) and also exposes .limit() (row lookups)
let selectQueue: unknown[][];
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));
const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("@db/db", () => ({
  db: {
    select: () => {
      const result = selectQueue.shift() ?? [];
      const whereResult = Object.assign(Promise.resolve(result), {
        limit: () => Promise.resolve(result),
      });
      return { from: () => ({ where: () => whereResult }) };
    },
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

import {
  parseEmailAddress,
  sendScheduledEmail,
} from "@/lib/process_scheduled_emails";

const pendingRow = {
  id: 5,
  userId: "user_1",
  status: "pending",
  toEmail: "client@example.com",
  toName: "Jane Client",
  subject: "Quarterly review",
  bodyHtml: "<p>Hello</p>",
  bodyText: "Hello",
  clientId: null,
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  selectQueue = [];
  mockUpdateWhere.mockResolvedValue(undefined);
  mockInsertValues.mockResolvedValue(undefined);
  mockGetFreshOutlookAccessToken.mockResolvedValue("token-123");
  mockAxiosGet.mockResolvedValue({ data: { mail: "me@example.com" } });
  mockAxiosPost.mockResolvedValue({
    data: { id: "outlook-1", conversationId: "conv-1" },
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("parseEmailAddress", () => {
  it("extracts name and email from 'Name <email>' format", () => {
    expect(parseEmailAddress('"Jane Client" <jane@example.com>')).toEqual({
      name: "Jane Client",
      email: "jane@example.com",
    });
  });

  it("returns a bare address with an empty name", () => {
    expect(parseEmailAddress("jane@example.com")).toEqual({
      name: "",
      email: "jane@example.com",
    });
  });
});

describe("sendScheduledEmail", () => {
  it("does nothing when the email is not pending", async () => {
    selectQueue = [[{ ...pendingRow, status: "sent" }]];

    await sendScheduledEmail(5);

    expect(mockGetFreshOutlookAccessToken).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("marks the email failed when Outlook is not connected", async () => {
    selectQueue = [[pendingRow]];
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);

    await sendScheduledEmail(5);

    expect(mockUpdateSet).toHaveBeenCalledWith({
      status: "failed",
      errorMessage: "Outlook not connected for user",
    });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("marks the email failed instead of rejecting when the token refresh throws", async () => {
    selectQueue = [[pendingRow]];
    mockGetFreshOutlookAccessToken.mockRejectedValue(
      new Error("refresh token revoked")
    );

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockUpdateSet).toHaveBeenCalledWith({
      status: "failed",
      errorMessage: "refresh token revoked",
    });
  });

  it("still sends with the account email as fallback when the profile fetch fails", async () => {
    selectQueue = [
      [pendingRow],
      [{ name: "Dan", email: "dan@example.com" }],
      [],
    ];
    mockAxiosGet.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: { data: { error: { message: "Insufficient privileges" } } },
    });
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await sendScheduledEmail(5);

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ fromEmail: "dan@example.com" })
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent" })
    );
    consoleWarnSpy.mockRestore();
  });

  it("marks the email failed with the Graph error message when the draft creation fails", async () => {
    selectQueue = [[pendingRow], [{ name: "Dan", email: "dan@example.com" }]];
    mockAxiosPost.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        data: { error: { message: "InvalidAuthenticationToken" } },
      },
    });

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({
      status: "failed",
      errorMessage: "InvalidAuthenticationToken",
    });
  });

  it("sends via Graph, records the sent email, and marks the row sent", async () => {
    selectQueue = [
      [pendingRow],
      [{ name: "Dan" }],
      [{ id: 9, email: "client@example.com" }],
    ];

    await sendScheduledEmail(5);

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(mockAxiosPost.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages"
    );
    expect(mockAxiosPost.mock.calls[1][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/outlook-1/send"
    );
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        outlookId: "outlook-1",
        conversationId: "conv-1",
        subject: "Quarterly review",
        isSent: true,
        clientId: 9,
        userId: "user_1",
      })
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent" })
    );
  });

  it("marks the email failed when the Graph send call fails", async () => {
    selectQueue = [[pendingRow], [{ name: "Dan" }]];
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith({
      status: "failed",
      errorMessage: "graph down",
    });
  });
});
