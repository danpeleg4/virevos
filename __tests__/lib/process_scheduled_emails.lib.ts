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
  scheduledEmails: { id: "id", status: "status" },
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
// directly (clients query) and also exposes .limit() (row lookups).
// db.update().set().where() is awaitable directly (failure updates) and
// exposes .returning() (pending-claim).
let selectQueue: unknown[][];
const mockClaimReturning = vi.fn();
const mockUpdateWhere = vi.fn(() =>
  Object.assign(Promise.resolve(undefined), { returning: mockClaimReturning })
);
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

// row as returned by the claim UPDATE ... RETURNING (already flipped to sent)
const claimedRow = {
  id: 5,
  userId: "user_1",
  status: "sent",
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
  mockClaimReturning.mockResolvedValue([claimedRow]);
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
  it("claims the row as sent before doing any other work", async () => {
    selectQueue = [[{ name: "Dan" }], []];

    await sendScheduledEmail(5);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent", sentAt: expect.any(Date) })
    );
    // the claim must win before the first Graph call
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockAxiosPost.mock.invocationCallOrder[0]
    );
  });

  it("does nothing when the claim finds no pending row (missing, sent, or claimed by Send Now)", async () => {
    mockClaimReturning.mockResolvedValue([]);

    await sendScheduledEmail(5);

    expect(mockGetFreshOutlookAccessToken).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
    // only the claim attempt itself touched the table
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
  });

  it("marks the email failed when Outlook is not connected", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);

    await sendScheduledEmail(5);

    expect(mockUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "Outlook not connected for user",
    });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("marks the email failed instead of rejecting when the token refresh throws", async () => {
    mockGetFreshOutlookAccessToken.mockRejectedValue(
      new Error("refresh token revoked")
    );

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "refresh token revoked",
    });
  });

  it("still sends with the account email as fallback when the profile fetch fails", async () => {
    selectQueue = [[{ name: "Dan", email: "dan@example.com" }], []];
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
    consoleWarnSpy.mockRestore();
  });

  it("marks the email failed with the Graph error message when the draft creation fails", async () => {
    selectQueue = [[{ name: "Dan", email: "dan@example.com" }]];
    mockAxiosPost.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        data: { error: { message: "InvalidAuthenticationToken" } },
      },
    });

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "InvalidAuthenticationToken",
    });
  });

  it("sends via Graph and records the sent email", async () => {
    selectQueue = [[{ name: "Dan" }], [{ id: 9, email: "client@example.com" }]];

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
    // the claim already marked the row sent; no second status update
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
  });

  it("marks the email failed (releasing the claim) when the Graph send call fails", async () => {
    selectQueue = [[{ name: "Dan" }]];
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendScheduledEmail(5)).resolves.toBeUndefined();

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "graph down",
    });
  });
});
