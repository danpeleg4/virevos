import type { Claimed, InsertSchEmail } from "@db/db";

const mockGetFreshOutlookAccessToken = vi.fn();
const mockGetCurrentUser = vi.fn();

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
import { ScheduledEmailServiceInterface } from "@/api_client/axios_api_client";

const fakeClass = {
  claimEmail: vi.fn(async (_id: number): Promise<Claimed | []> => {
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
        clientId: 1,
        scheduledAt: new Date(),
        timezone: "UTC",
        recurring: "",
        sentAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
      },
    ];
  }),
  markAsFailed: async (_id: number): Promise<void> => {},
  getUserRows: async (_userId: string) => [
    { name: "Dan", email: "dan@example.com" },
  ],
  getAllClients: async (_userId: string) => [
    { id: 1, email: "client@example.com" },
  ],
  insertOutlookEmail: vi.fn(async () => {}),
  catchFailedInsertOutlookEmail: vi.fn(async () => {}),
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
  deleteScheduledEmailById: vi.fn(
    async (_scheduledEmailId: number, _userId: string) => [{ id: 5 }]
  ),
};

const fakeScheduledEmailService = {
  getProfile: vi.fn(async () => ({ mail: "me@example.com" })),
  draftMessage: vi.fn(async () => ({
    id: "outlook-1",
    conversationId: "conv-1",
  })),
  sendDraftMessage: vi.fn(async () => {}),
} satisfies ScheduledEmailServiceInterface;

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockGetCurrentUser.mockResolvedValue({ id: "user_1" });
  mockGetFreshOutlookAccessToken.mockResolvedValue("token-123");
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
    const result = await sendScheduledEmail(
      5,
      noPending,
      fakeScheduledEmailService
    );
    expect(result).toEqual({ outcome: "skipped" });
  });

  it("marks the email failed when Outlook is not connected", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);
    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      outcome: "failed",
      error: "Outlook not connected for user",
    });
    expect(fakeScheduledEmailService.getProfile).not.toHaveBeenCalled();
  });

  it("still sends with the account email as fallback when the profile fetch fails", async () => {
    fakeScheduledEmailService.getProfile.mockRejectedValueOnce(
      new Error("Insufficient privileges")
    );
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      outcome: "sent",
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[process_scheduled_emails] Graph /me failed; using account email"
    );

    expect(fakeScheduledEmailService.getProfile).toHaveBeenCalledTimes(1);
    expect(fakeScheduledEmailService.draftMessage).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockRestore();
  });

  it("marks the email failed with the Graph error message when the draft creation fails", async () => {
    await fakeClass.claimEmail(5); // claim the email first
    fakeScheduledEmailService.draftMessage.mockRejectedValueOnce(
      new Error("InvalidAuthenticationToken")
    );

    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      outcome: "failed",
      error: "InvalidAuthenticationToken",
    });

    expect(fakeClass.insertOutlookEmail).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail).toHaveBeenLastCalledWith(
      "InvalidAuthenticationToken",
      5
    );
  });

  it("sends via Graph and records the sent email", async () => {
    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      outcome: "sent",
    });

    expect(fakeScheduledEmailService.draftMessage).toHaveBeenCalledTimes(1);
    expect(fakeScheduledEmailService.sendDraftMessage).toHaveBeenCalledTimes(1);
    expect(fakeClass.insertOutlookEmail).toHaveBeenCalledWith(
      "outlook-1",
      "conv-1",
      expect.objectContaining({ id: 5, subject: "Quarterly review" }),
      "me@example.com",
      "Dan",
      1,
      "user_1"
    );
    // the claim already marked the row sent; no second status update
    expect(fakeClass.claimEmail).toHaveBeenCalledTimes(1);
  });

  it("still reports sent when post-send bookkeeping fails — the email was delivered", async () => {
    fakeClass.insertOutlookEmail.mockRejectedValueOnce(new Error("db down"));

    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({ outcome: "sent" });

    // the claimed row must stay "sent" — no failed flip after delivery
    expect(fakeClass.catchFailedInsertOutlookEmail).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[process_scheduled_emails] post-send bookkeeping failed for",
      5,
      expect.any(Error)
    );
  });

  it("marks the email failed (releasing the claim) when the Graph send call fails", async () => {
    await fakeClass.claimEmail(5); // claim the email first
    fakeScheduledEmailService.sendDraftMessage.mockRejectedValue(
      new Error("graph down")
    );

    await expect(
      sendScheduledEmail(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      outcome: "failed",
      error: "graph down",
    });

    expect(fakeClass.insertOutlookEmail).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail).toHaveBeenLastCalledWith(
      "graph down",
      5
    );
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
    expect(result).toEqual({
      id: 1,
      toEmail: "dan@example.com",
      toName: "Dan",
      subject: "Test Email",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
      scheduledAt: new Date(fakeInput.scheduledAt), // exact parsed date
      timezone: "UTC",
      recurring: "none",
      status: "pending",
      clientId: null,
      userId: "user_1",
      sentAt: null,
      errorMessage: null,
      createdAt: expect.any(Date),
    });
  });
});

describe("sendScheduledEmailNow", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(
      sendScheduledEmailNow(5, fakeClass, fakeScheduledEmailService)
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects a non-integer id", async () => {
    await expect(
      sendScheduledEmailNow(
        "nope" as unknown as number,
        fakeClass,
        fakeScheduledEmailService
      )
    ).rejects.toThrow("id must be a number");
  });

  it("throws 404 when the email does not exist or belongs to another user", async () => {
    await expect(
      sendScheduledEmailNow(999, fakeClass, fakeScheduledEmailService)
    ).rejects.toThrow("Scheduled email not found", 404);
  });

  it("resolves success after claiming and sending the email", async () => {
    fakeScheduledEmailService.draftMessage.mockResolvedValue({
      id: "outlook-1",
      conversationId: "conv-1",
    });
    fakeScheduledEmailService.sendDraftMessage.mockResolvedValue();
    await expect(
      sendScheduledEmailNow(5, fakeClass, fakeScheduledEmailService)
    ).resolves.toEqual({
      success: true,
    });
    expect(fakeScheduledEmailService.draftMessage).toHaveBeenCalledTimes(1);
    expect(fakeScheduledEmailService.sendDraftMessage).toHaveBeenCalledTimes(1);
  });

  it("throws 409 when the email was already sent or cancelled", async () => {
    const alreadySentFake = {
      ...fakeClass,
      claimEmail: async (): Promise<Claimed | []> => [],
    };
    await expect(
      sendScheduledEmailNow(5, alreadySentFake, fakeScheduledEmailService)
    ).rejects.toThrow("Scheduled email was already sent or cancelled");
  });

  it("falls back to a generic message when the failure has no error text", async () => {
    // non-Error, non-Axios rejection produces an empty error message
    fakeScheduledEmailService.draftMessage.mockRejectedValueOnce("boom");

    await expect(
      sendScheduledEmailNow(5, fakeClass, fakeScheduledEmailService)
    ).rejects.toThrow("Send failed");
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
    expect(fakeClass.deleteScheduledEmailById).toHaveBeenCalledWith(
      5,
      "user_1"
    );
  });

  it("throws 409 when the row exists but was already sent", async () => {
    // the status-guarded delete matches nothing for a sent row
    fakeClass.deleteScheduledEmailById.mockResolvedValueOnce([]);

    await expect(deleteScheduledEmail(5, fakeClass)).rejects.toMatchObject({
      message: "Scheduled email was already sent and cannot be deleted",
      status: 409,
    });
  });
});
