import type { SendOutlookEmailInput } from "@/lib/outlook/outlook_actions";
import {
  deleteOutlookMessage,
  listOutlookEmails,
  sendOutlookEmail,
  syncOutlookInbox,
  updateOutlookMessage,
} from "@/lib/outlook/outlook_actions";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalOutlookEmail,
  makeFakeOutlookDb,
} from "../fakes/fake_outlook_db";
import { makeFakeCalendarDb } from "../fakes/fake_calendar_db";
import { makeFakeGraphAuthService } from "../fakes/fake_graph_auth_service";
import { makeFakeGraphMailService } from "../fakes/fake_graph_mail_service";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakeOpenAIClient } from "../fakes/fake_openai_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/util/html_sanitizer", () => ({
  sanitizeEmailHtml: (html: string) => html,
}));

const mockPerformIncrementalSync = vi.fn();
vi.mock("@/lib/outlook/outlook_sync", () => ({
  performIncrementalSync: (...args: unknown[]) =>
    mockPerformIncrementalSync(...args),
}));

const outlookDb = makeFakeOutlookDb();
const calendarDb = makeFakeCalendarDb();
const graphAuthService = makeFakeGraphAuthService();
const graphMailService = makeFakeGraphMailService();
const storage = makeFakeStorageClient();
const openaiClient = makeFakeOpenAIClient();

const baseInput: SendOutlookEmailInput = {
  to: "client@example.com",
  toName: "Jane Client",
  subject: "Hello",
  bodyHtml: "<p>Hi there</p>",
  bodyText: "Hi there",
};

const send = (input: Partial<SendOutlookEmailInput>) =>
  sendOutlookEmail(
    input,
    outlookDb,
    storage,
    graphAuthService,
    graphMailService
  );

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("sendOutlookEmail", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    await expect(send(baseInput)).rejects.toThrow("Unauthorized");
    expect(graphMailService.sendMail).not.toHaveBeenCalled();
  });

  it("throws when Outlook is not connected", async () => {
    outlookDb.getTokenByUserId.mockResolvedValueOnce([]);

    await expect(send(baseInput)).rejects.toThrow(
      "Outlook account not connected"
    );
    expect(graphMailService.sendMail).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient email", async () => {
    await expect(send({ ...baseInput, to: "not-an-email" })).rejects.toThrow();
    expect(graphMailService.sendMail).not.toHaveBeenCalled();
  });

  it("sends a compose email via sendMail", async () => {
    const result = await send(baseInput);

    expect(result).toEqual({ success: true });
    expect(graphMailService.sendMail).toHaveBeenCalledTimes(1);
    const [, payload] = graphMailService.sendMail.mock.calls[0];
    expect((payload as { subject: string }).subject).toBe("Hello");
    expect((payload as { toRecipients: unknown[] }).toRecipients).toEqual([
      { emailAddress: { address: "client@example.com", name: "Jane Client" } },
    ]);
  });

  it("sends a reply via the reply endpoint", async () => {
    const result = await send({
      ...baseInput,
      replyToOutlookId: "msg-9",
      threadId: "thread-1",
    });

    expect(result).toEqual({ success: true });
    expect(graphMailService.replyMail).toHaveBeenCalledWith(
      "access-token-1",
      "msg-9",
      expect.any(Object)
    );
    expect(graphMailService.sendMail).not.toHaveBeenCalled();
  });

  it("propagates the send failure", async () => {
    graphMailService.sendMail.mockRejectedValueOnce(new Error("graph down"));

    await expect(send(baseInput)).rejects.toThrow("graph down");
  });

  it("sends attachments via a draft", async () => {
    const result = await send({
      ...baseInput,
      attachments: [
        {
          name: "doc.pdf",
          data: Buffer.from("pdf-bytes").toString("base64"),
          mimeType: "application/pdf",
        },
      ],
    });

    expect(result).toEqual({ success: true });
    expect(graphMailService.createDraft).toHaveBeenCalledTimes(1);
    expect(graphMailService.addSmallAttachment).toHaveBeenCalledWith(
      "access-token-1",
      "draft-1",
      expect.objectContaining({ name: "doc.pdf" })
    );
    expect(graphMailService.sendDraft).toHaveBeenCalledWith(
      "access-token-1",
      "draft-1"
    );
  });

  it("downloads path-based attachments from storage", async () => {
    storage.downloadFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

    await send({
      ...baseInput,
      attachments: [{ name: "existing.pdf", path: "cases/user_1/x.pdf" }],
    });

    expect(storage.downloadFile).toHaveBeenCalledWith(
      "projectFiles",
      "cases/user_1/x.pdf"
    );
    expect(graphMailService.addSmallAttachment).toHaveBeenCalled();
  });
});

describe("updateOutlookMessage", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      updateOutlookMessage(
        1,
        "star",
        outlookDb,
        graphAuthService,
        graphMailService
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("throws 404 when the email is not found", async () => {
    outlookDb.getEmailById.mockResolvedValueOnce([]);
    await expect(
      updateOutlookMessage(
        1,
        "star",
        outlookDb,
        graphAuthService,
        graphMailService
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  it("stars the email locally and flags it in Graph", async () => {
    await updateOutlookMessage(
      1,
      "star",
      outlookDb,
      graphAuthService,
      graphMailService
    );

    expect(outlookDb.updateEmail).toHaveBeenCalledWith(1, {
      isStarred: true,
    });
    expect(graphMailService.patchMessage).toHaveBeenCalledWith(
      "access-token-1",
      canonicalOutlookEmail.outlookId,
      { flag: { flagStatus: "flagged" } }
    );
  });

  it("archives the email and moves it in Graph", async () => {
    await updateOutlookMessage(
      1,
      "archive",
      outlookDb,
      graphAuthService,
      graphMailService
    );

    expect(outlookDb.updateEmail).toHaveBeenCalledWith(1, {
      isArchived: true,
    });
    expect(graphMailService.moveMessage).toHaveBeenCalledWith(
      "access-token-1",
      canonicalOutlookEmail.outlookId,
      "archive"
    );
  });

  it("swallows Graph sync failures", async () => {
    graphMailService.patchMessage.mockRejectedValueOnce(
      new Error("graph down")
    );

    await expect(
      updateOutlookMessage(
        1,
        "markRead",
        outlookDb,
        graphAuthService,
        graphMailService
      )
    ).resolves.toEqual({ success: true });
  });
});

describe("deleteOutlookMessage", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      deleteOutlookMessage(1, outlookDb, graphAuthService, graphMailService)
    ).rejects.toThrow("Unauthorized");
  });

  it("throws 404 when the email is not found", async () => {
    outlookDb.getEmailById.mockResolvedValueOnce([]);
    await expect(
      deleteOutlookMessage(1, outlookDb, graphAuthService, graphMailService)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("deletes locally and in Graph", async () => {
    const result = await deleteOutlookMessage(
      1,
      outlookDb,
      graphAuthService,
      graphMailService
    );

    expect(result).toEqual({ success: true });
    expect(outlookDb.deleteEmail).toHaveBeenCalledWith(1);
    expect(graphMailService.deleteMessage).toHaveBeenCalledWith(
      "access-token-1",
      canonicalOutlookEmail.outlookId
    );
  });

  it("still deletes locally when the Graph delete fails", async () => {
    graphMailService.deleteMessage.mockRejectedValueOnce(
      new Error("graph down")
    );

    await expect(
      deleteOutlookMessage(1, outlookDb, graphAuthService, graphMailService)
    ).resolves.toEqual({ success: true });
    expect(outlookDb.deleteEmail).toHaveBeenCalledWith(1);
  });
});

describe("syncOutlookInbox", () => {
  it("throws Unauthorized when there is no user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      syncOutlookInbox(
        outlookDb,
        calendarDb,
        graphAuthService,
        graphMailService,
        storage,
        openaiClient
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("triggers an incremental sync for the current user", async () => {
    mockPerformIncrementalSync.mockResolvedValueOnce(undefined);

    await expect(
      syncOutlookInbox(
        outlookDb,
        calendarDb,
        graphAuthService,
        graphMailService,
        storage,
        openaiClient
      )
    ).resolves.toEqual({ success: true });

    expect(mockPerformIncrementalSync).toHaveBeenCalledWith(
      "user_1",
      outlookDb,
      calendarDb,
      graphAuthService,
      graphMailService,
      storage,
      openaiClient
    );
  });
});

describe("listOutlookEmails", () => {
  const options = {
    page: 1,
    limit: 50,
    search: "",
    filter: "all" as const,
  };

  it("returns mapped messages with hasMore false when under the page limit", async () => {
    const result = await listOutlookEmails("user_1", options, outlookDb);

    expect(result.hasMore).toBe(false);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      id: String(canonicalOutlookEmail.id),
      from: canonicalOutlookEmail.fromName,
      unread: true,
    });
  });

  it("computes hasMore when an extra row is returned", async () => {
    outlookDb.getEmailsForUser.mockResolvedValueOnce([
      { ...canonicalOutlookEmail, clientName: null },
      { ...canonicalOutlookEmail, id: 2, clientName: null },
    ]);

    const result = await listOutlookEmails(
      "user_1",
      { ...options, limit: 1 },
      outlookDb
    );

    expect(result.hasMore).toBe(true);
    expect(result.messages).toHaveLength(1);
  });

  it("passes search and filter through to the db query", async () => {
    await listOutlookEmails(
      "user_1",
      { page: 2, limit: 10, search: "invoice", filter: "starred" },
      outlookDb
    );

    expect(outlookDb.getEmailsForUser).toHaveBeenCalledWith("user_1", {
      search: "invoice",
      filter: "starred",
      limit: 11,
      offset: 10,
    });
  });
});
