import type { Claimed } from "@db/classes/scheduled_emails_db";

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
  getScheduledEmails,
  parseEmailAddress,
  processDueScheduledEmails,
  ScheduleEmailInput,
  sendScheduledEmail,
  sendScheduledEmailNow,
} from "@/lib/scheduled_emails";
import {
  canonicalScheduledEmail,
  makeFakeScheduledEmailsDb,
} from "../fakes/fake_scheduled_emails_db";
import { makeFakeScheduledEmailService } from "../fakes/fake_scheduled_email_service";
import { makeFakeOutlookDb } from "../fakes/fake_outlook_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { MAX_ATTACHMENT_BYTES } from "@/lib/util/validation";

const fakeClass = makeFakeScheduledEmailsDb();
const fakeScheduledEmailService = makeFakeScheduledEmailService();
const outlookDb = makeFakeOutlookDb();
const graphAuthService = makeFakeGraphAuthService();
const storage = makeFakeStorageClient();

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
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );
    expect(result).toEqual({ outcome: "skipped" });
  });

  it("releases the claim back to pending on a transient token-refresh error", async () => {
    mockGetFreshOutlookAccessToken.mockRejectedValueOnce(
      new Error("ECONNRESET")
    );

    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).resolves.toEqual({
      outcome: "retry",
      error: "ECONNRESET",
    });

    expect(fakeClass.unclaimEmail).toHaveBeenCalledWith(5);
    expect(fakeClass.markAsFailed).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail).not.toHaveBeenCalled();
    expect(fakeScheduledEmailService.draftMessage).not.toHaveBeenCalled();
  });

  it("releases the claim back to pending on a transient user-lookup error", async () => {
    fakeClass.getUserRows.mockRejectedValueOnce(new Error("db down"));

    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).resolves.toEqual({
      outcome: "retry",
      error: "db down",
    });

    expect(fakeClass.unclaimEmail).toHaveBeenCalledWith(5);
    expect(fakeClass.markAsFailed).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail).not.toHaveBeenCalled();
    expect(fakeScheduledEmailService.draftMessage).not.toHaveBeenCalled();
  });

  it("marks the email failed when Outlook is not connected", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);
    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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

  it("sends inline data attachments via apiClient.addAttachment", async () => {
    fakeClass.claimEmail.mockResolvedValueOnce([
      {
        ...canonicalScheduledEmail,
        attachments: [
          {
            name: "doc.pdf",
            mimeType: "application/pdf",
            data: Buffer.from("pdf-bytes").toString("base64"),
          },
        ],
      },
    ]);

    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).resolves.toEqual({ outcome: "sent" });

    expect(fakeScheduledEmailService.addAttachment).toHaveBeenCalledWith(
      expect.any(Object),
      "outlook-1",
      expect.objectContaining({
        name: "doc.pdf",
        contentType: "application/pdf",
      })
    );
    expect(fakeScheduledEmailService.sendDraftMessage).toHaveBeenCalledWith(
      expect.any(Object),
      "outlook-1"
    );
  });

  it("downloads path-based attachments from storage before attaching them", async () => {
    storage.downloadFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));
    fakeClass.claimEmail.mockResolvedValueOnce([
      {
        ...canonicalScheduledEmail,
        attachments: [{ name: "existing.pdf", path: "cases/user_1/x.pdf" }],
      },
    ]);

    await sendScheduledEmail(
      5,
      fakeClass,
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );

    expect(storage.downloadFile).toHaveBeenCalledWith(
      "projectFiles",
      "cases/user_1/x.pdf"
    );
    expect(fakeScheduledEmailService.addAttachment).toHaveBeenCalled();
  });

  it("appends url-only attachments as a link in the body instead of calling addAttachment", async () => {
    fakeClass.claimEmail.mockResolvedValueOnce([
      {
        ...canonicalScheduledEmail,
        attachments: [{ name: "Shared doc", url: "https://example.com/doc" }],
      },
    ]);

    await sendScheduledEmail(
      5,
      fakeClass,
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );

    const [, payload] = fakeScheduledEmailService.draftMessage.mock.calls[0];
    expect((payload as { body: { content: string } }).body.content).toContain(
      "https://example.com/doc"
    );
    expect(fakeScheduledEmailService.addAttachment).not.toHaveBeenCalled();
  });

  it("marks the email failed when a resolved attachment exceeds the size limit", async () => {
    const oversized = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1).toString("base64");
    fakeClass.claimEmail.mockResolvedValueOnce([
      {
        ...canonicalScheduledEmail,
        attachments: [{ name: "huge.zip", data: oversized }],
      },
    ]);

    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).resolves.toEqual({
      outcome: "failed",
      error: expect.stringContaining("huge.zip"),
    });

    expect(fakeScheduledEmailService.addAttachment).not.toHaveBeenCalled();
    expect(fakeScheduledEmailService.sendDraftMessage).not.toHaveBeenCalled();
    expect(fakeClass.catchFailedInsertOutlookEmail).toHaveBeenCalled();
  });

  it("still reports sent when post-send bookkeeping fails — the email was delivered", async () => {
    fakeClass.insertOutlookEmail.mockRejectedValueOnce(new Error("db down"));

    await expect(
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
      sendScheduledEmail(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      attachments: null,
      clientId: null,
      userId: "user_1",
      sentAt: null,
      errorMessage: null,
      createdAt: expect.any(Date),
    });
  });

  it("throws error when scheduledAt is a date in the past", async () => {
    const res = createScheduledEmail(
      {
        ...fakeInput,
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      fakeClass
    );
    await expect(res).rejects.toThrow("Scheduled date must be in the future");
  });

  it("persists validated attachments alongside the email", async () => {
    const result = await createScheduledEmail(
      {
        ...fakeInput,
        attachments: [
          { name: "doc.pdf", mimeType: "application/pdf", data: "cGRm" },
        ],
      },
      fakeClass
    );
    expect(result.attachments).toEqual([
      {
        name: "doc.pdf",
        mimeType: "application/pdf",
        data: "cGRm",
        url: undefined,
        path: undefined,
      },
    ]);
  });

  it("rejects more attachments than the allowed max", async () => {
    const tooMany = Array.from({ length: 26 }, (_, i) => ({
      name: `file-${i}.txt`,
      data: "aGk=",
    }));
    await expect(
      createScheduledEmail({ ...fakeInput, attachments: tooMany }, fakeClass)
    ).rejects.toThrow("attachments exceeds max of 25");
  });

  it("rejects an inline attachment whose decoded size exceeds the limit", async () => {
    const oversized = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1).toString("base64");
    await expect(
      createScheduledEmail(
        {
          ...fakeInput,
          attachments: [{ name: "huge.zip", data: oversized }],
        },
        fakeClass
      )
    ).rejects.toThrow(/exceeds the .* byte limit/);
  });
});

describe("sendScheduledEmailNow", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(
      sendScheduledEmailNow(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects a non-integer id", async () => {
    await expect(
      sendScheduledEmailNow(
        "nope" as unknown as number,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).rejects.toThrow("id must be a number");
  });

  it("throws 404 when the email does not exist or belongs to another user", async () => {
    await expect(
      sendScheduledEmailNow(
        999,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).rejects.toThrow("Scheduled email not found", 404);
  });

  it("resolves success after claiming and sending the email", async () => {
    fakeScheduledEmailService.draftMessage.mockResolvedValue({
      id: "outlook-1",
      conversationId: "conv-1",
    });
    fakeScheduledEmailService.sendDraftMessage.mockResolvedValue();
    await expect(
      sendScheduledEmailNow(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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
      sendScheduledEmailNow(
        5,
        alreadySentFake,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).rejects.toThrow("Scheduled email was already sent or cancelled");
  });

  it("throws 503 when a transient pre-send error leaves the row pending for retry", async () => {
    mockGetFreshOutlookAccessToken.mockRejectedValueOnce(
      new Error("ECONNRESET")
    );

    await expect(
      sendScheduledEmailNow(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
    ).rejects.toMatchObject({
      message: "ECONNRESET",
      status: 503,
    });

    expect(fakeClass.unclaimEmail).toHaveBeenCalledWith(5);
  });

  it("falls back to a generic message when the failure has no error text", async () => {
    // non-Error, non-Axios rejection produces an empty error message
    fakeScheduledEmailService.draftMessage.mockRejectedValueOnce("boom");

    await expect(
      sendScheduledEmailNow(
        5,
        fakeClass,
        fakeScheduledEmailService,
        outlookDb,
        graphAuthService,
        storage
      )
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

describe("getScheduledEmails", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(getScheduledEmails(fakeClass)).rejects.toThrow("Unauthorized");
    expect(fakeClass.getScheduledEmailsByUser).not.toHaveBeenCalled();
  });

  it("returns the current user's scheduled emails", async () => {
    await expect(getScheduledEmails(fakeClass)).resolves.toEqual([
      canonicalScheduledEmail,
    ]);
    expect(fakeClass.getScheduledEmailsByUser).toHaveBeenCalledWith("user_1");
  });
});

describe("processDueScheduledEmails", () => {
  it("sends every due email and reports the processed count", async () => {
    const result = await processDueScheduledEmails(
      fakeClass,
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );

    expect(result).toEqual({ processed: 1 });
    expect(fakeClass.claimEmail).toHaveBeenCalledWith(5);
    expect(fakeScheduledEmailService.sendDraftMessage).toHaveBeenCalledTimes(1);
  });

  it("returns processed: 0 when nothing is due", async () => {
    fakeClass.getDueScheduledEmailIds.mockResolvedValueOnce([]);

    const result = await processDueScheduledEmails(
      fakeClass,
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );

    expect(result).toEqual({ processed: 0 });
    expect(fakeClass.claimEmail).not.toHaveBeenCalled();
  });

  it("logs and keeps going when a single send rejects unexpectedly", async () => {
    fakeClass.getDueScheduledEmailIds.mockResolvedValueOnce([
      { id: 5 },
      { id: 6 },
    ]);
    fakeClass.claimEmail.mockRejectedValueOnce(new Error("db down")); // id 5 blows up

    const result = await processDueScheduledEmails(
      fakeClass,
      fakeScheduledEmailService,
      outlookDb,
      graphAuthService,
      storage
    );

    // the batch still completes; the rejection is logged per email
    expect(result).toEqual({ processed: 2 });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[cron/process-scheduled-emails] failed for id",
      5,
      expect.any(Error)
    );
  });
});
