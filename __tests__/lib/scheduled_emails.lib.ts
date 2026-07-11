import type { Claimed, InsertSchEmail } from "@db/db";

const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockGetFreshOutlookAccessToken = vi.fn();
const mockGetCurrentUser = vi.fn();

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

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

vi.mock("@/lib/util/html_sanitizer", () => ({
  sanitizeEmailHtml: (html: string) => html,
}));

import {
  createScheduledEmail,
  deleteScheduledEmail,
  parseEmailAddress,
  ScheduleEmailInput,
  sendScheduledEmail,
  sendScheduledEmailNow,
} from "@/lib/scheduled_emails";

const fakeClass = {
  claimEmail: async (id: number): Promise<Claimed | []> => {
    return [
      {
        id: 5,
        userId: "user_1",
        status: "sent",
        toEmail: "client@example.com",
        toName: "Jane Client",
        subject: "Quarterly review",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
        clientId: null,
        scheduledAt: new Date(),
        timezone: "UTC",
        recurring: null,
        sentAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
      },
    ];
  },
  markAsFailed: async (_id: number): Promise<void> => {},
  getUserRows: async (_userId: string) => [
    { name: "Dan", email: "dan@example.com" },
  ],
  getAllClients: async (_userId: string) => [
    { id: 1, email: "client@example.com" },
  ],
  insertOutlookEmail: async () => {},
  catchFailedInsertOutlookEmail: async () => {},
  insertScheduledEmail: async (input: InsertSchEmail) => {
    return {
      ...input,
      id: 1,
      status: "pending",
      sentAt: null,
      errorMessage: null,
      createdAt: new Date(),
    };
  },
  getScheduledEmailById: async (scheduledEmailId: number, userId: string) => {
    if (scheduledEmailId === 5 && userId === "user_1") {
      return [{ id: 5 }];
    }
    return [];
  },
  deleteScheduledEmailById: async (
    scheduledEmailId: number,
    userId: string
  ) => {},
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockGetCurrentUser.mockResolvedValue({ id: "user_1" });
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
  it("extracts name and email from 'Name <email>' format", async () => {
    expect(await parseEmailAddress('"Jane Client" <jane@example.com>')).toEqual(
      {
        name: "Jane Client",
        email: "jane@example.com",
      }
    );
  });

  it("returns a bare address with an empty name", async () => {
    expect(await parseEmailAddress("jane@example.com")).toEqual({
      name: "",
      email: "jane@example.com",
    });
  });
});

describe("sendScheduledEmail", () => {
  it('returns { outcome: "skipped" } if no pending row is found', async () => {
    const noPending = {
      ...fakeClass,
      claimEmail: async (): Promise<Claimed | []> => [],
    };
    const result = await sendScheduledEmail(5, noPending);
    expect(result).toEqual({ outcome: "skipped" });
  });

  it("marks the email failed when Outlook is not connected", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);

    await expect(sendScheduledEmail(5, fakeClass)).resolves.toEqual({
      outcome: "failed",
      error: "Outlook not connected for user",
    });

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("still sends with the account email as fallback when the profile fetch fails", async () => {
    mockAxiosGet.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 403",
      response: { data: { error: { message: "Insufficient privileges" } } },
    });
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await expect(sendScheduledEmail(5, fakeClass)).resolves.toEqual({
      outcome: "sent",
    });

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    consoleWarnSpy.mockRestore();
  });

  it("marks the email failed with the Graph error message when the draft creation fails", async () => {
    await fakeClass.claimEmail(5); // claim the email first
    mockAxiosPost.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        data: { error: { message: "InvalidAuthenticationToken" } },
      },
    });

    await expect(sendScheduledEmail(5, fakeClass)).resolves.toEqual({
      outcome: "failed",
      error: "InvalidAuthenticationToken",
    });

    expect(fakeClass.insertOutlookEmail()).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail()).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "InvalidAuthenticationToken",
    });
  });

  it("sends via Graph and records the sent email", async () => {
    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(mockAxiosPost.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages"
    );
    expect(mockAxiosPost.mock.calls[1][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/outlook-1/send"
    );
    expect(fakeClass.insertOutlookEmail()).toHaveBeenCalledWith(
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
    expect(fakeClass.claimEmail(5)).toHaveBeenCalledTimes(1);
  });

  it("marks the email failed (releasing the claim) when the Graph send call fails", async () => {
    await fakeClass.claimEmail(5); // claim the email first
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendScheduledEmail(5, fakeClass)).resolves.toEqual({
      outcome: "failed",
      error: "graph down",
    });

    expect(fakeClass.insertOutlookEmail()).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail()).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "graph down",
    });
  });
});

describe("createScheduledEmail", () => {
  const fakeInput: ScheduleEmailInput = {
    toEmail: "dan@example.com",
    toName: "Dan",
    subject: "Test Email",
    bodyHtml: "<p>Hello</p>",
    bodyText: "Hello",
    scheduledAt: new Date().toISOString(),
    timezone: "UTC",
    recurring: null,
    clientId: null,
  };

  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(createScheduledEmail(fakeInput, fakeClass)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("creates a scheduled email successfully", async () => {
    const result = await createScheduledEmail(fakeInput, fakeClass);
    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        toEmail: "dan@example.com",
        toName: "Dan",
        subject: "Test Email",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
        scheduledAt: expect.any(String),
        timezone: "UTC",
        recurring: null,
        clientId: null,
      })
    );
  });
});

describe("sendScheduledEmailNow", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(sendScheduledEmailNow(5, fakeClass)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("rejects a non-integer id", async () => {
    await expect(
      sendScheduledEmailNow("nope" as unknown as number, fakeClass)
    ).rejects.toThrow("id must be a number");
  });

  it("throws 404 when the email does not exist or belongs to another user", async () => {
    await expect(sendScheduledEmailNow(999, fakeClass)).rejects.toThrow(
      "Scheduled email not found",
      404
    );
  });

  it("resolves success after claiming and sending the email", async () => {
    await expect(sendScheduledEmailNow(5, fakeClass)).resolves.toEqual({
      success: true,
    });
    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    // expect(sendScheduledEmail(5, fakeClass)).toHaveBeenCalledTimes(1);
  });

  it("throws 409 when the email was already sent or cancelled", async () => {
    const alreadySentFake = {
      ...fakeClass,
      claimEmail: async (): Promise<Claimed | []> => [],
    };
    await expect(sendScheduledEmailNow(5, alreadySentFake)).rejects.toThrow(
      "Scheduled email was already sent or cancelled"
    );
    await expect(sendScheduledEmailNow(999, fakeClass)).rejects.toThrow(
      "Scheduled email was already sent or cancelled",
      409
    );
  });

  it("falls back to a generic message when the failure has no error text", async () => {
    // non-Error, non-Axios rejection produces an empty error message
    mockAxiosPost.mockRejectedValue("boom");

    await expect(sendScheduledEmailNow(5, fakeClass)).rejects.toThrow(
      "Send failed"
    );
  });
});

describe("deleteScheduledEmail", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(deleteScheduledEmail(5, fakeClass)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws 404 when the email does not exist or belongs to another user", async () => {
    await expect(deleteScheduledEmail(999, fakeClass)).rejects.toThrow(
      "Scheduled email not found"
    );
  });

  it("returns success when the email is deleted", async () => {
    const result = await deleteScheduledEmail(5, fakeClass);
    expect(result).toEqual({ success: true });
  });
});
