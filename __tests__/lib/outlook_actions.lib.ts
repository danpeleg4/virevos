import type { SendOutlookEmailInput } from "@/lib/outlook/outlook_actions";

const mockGetCurrentUser = vi.fn();
const mockGetFreshOutlookAccessToken = vi.fn();
const mockDeleteScheduledEmail = vi.fn();
const mockAxiosPost = vi.fn();
const mockAxiosPut = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

// db.update chain: .set().where() is awaitable directly (failure revert) and
// exposes .returning() (pending-claim)
const mockClaimReturning = vi.fn();
const mockDbUpdateWhere = vi.fn(() =>
  Object.assign(Promise.resolve(undefined), { returning: mockClaimReturning })
);
const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateWhere }));
const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }));

vi.mock("@db/db", () => ({
  db: {
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}));
vi.mock("@db/schema", () => ({ outlookEmails: {}, scheduledEmails: {} }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("axios", () => {
  const axios = {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    put: (...args: unknown[]) => mockAxiosPut(...args),
    patch: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    isAxiosError: (e: unknown) =>
      !!(e as { isAxiosError?: boolean })?.isAxiosError,
  };
  return { default: axios, ...axios };
});

vi.mock("@/lib/outlook/outlook_sync", () => ({
  performIncrementalSync: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_access", () => ({
  getFreshOutlookAccessToken: (...args: unknown[]) =>
    mockGetFreshOutlookAccessToken(...args),
}));

vi.mock("@/lib/storage", () => ({
  downloadFile: vi.fn(),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "files",
}));

vi.mock("@/lib/util/html_sanitizer", () => ({
  sanitizeEmailHtml: (html: string) => html,
}));

vi.mock("@/lib/scheduled_emails", () => ({
  deleteScheduledEmail: (...args: unknown[]) =>
    mockDeleteScheduledEmail(...args),
}));

import { sendOutlookEmail } from "@/lib/outlook/outlook_actions";

const baseInput: SendOutlookEmailInput = {
  to: "client@example.com",
  toName: "Jane Client",
  subject: "Hello",
  bodyHtml: "<p>Hi there</p>",
  bodyText: "Hi there",
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockGetCurrentUser.mockResolvedValue({ id: "user_1" });
  mockGetFreshOutlookAccessToken.mockResolvedValue("token-123");
  mockAxiosPost.mockResolvedValue({ data: { id: "draft-1" } });
  mockAxiosPut.mockResolvedValue({ data: {} });
  mockDeleteScheduledEmail.mockResolvedValue({ success: true });
  mockClaimReturning.mockResolvedValue([{ id: 42 }]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("sendOutlookEmail", () => {
  it("throws Unauthorized when there is no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(sendOutlookEmail(baseInput)).rejects.toThrow("Unauthorized");
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("throws when Outlook is not connected", async () => {
    mockGetFreshOutlookAccessToken.mockResolvedValue(null);

    await expect(sendOutlookEmail(baseInput)).rejects.toThrow(
      "Outlook account not connected"
    );
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient email", async () => {
    await expect(
      sendOutlookEmail({ ...baseInput, to: "not-an-email" })
    ).rejects.toThrow();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("sends a compose email without an id and does not touch scheduled emails", async () => {
    const result = await sendOutlookEmail(baseInput);

    expect(result).toEqual({ success: true });
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    const [url, payload] = mockAxiosPost.mock.calls[0];
    expect(url).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
    expect(payload.message.subject).toBe("Hello");
    expect(payload.message.toRecipients).toEqual([
      { emailAddress: { address: "client@example.com", name: "Jane Client" } },
    ]);
    expect(mockDbUpdate).not.toHaveBeenCalled();
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("sends a reply without an id via the reply endpoint", async () => {
    const result = await sendOutlookEmail({
      ...baseInput,
      replyToOutlookId: "msg-9",
      threadId: "thread-1",
    });

    expect(result).toEqual({ success: true });
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg-9/reply"
    );
    expect(mockDbUpdate).not.toHaveBeenCalled();
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("claims the pending row before sending and deletes it after when an id is provided", async () => {
    const result = await sendOutlookEmail({ ...baseInput, id: 42 });

    expect(result).toEqual({ success: true });
    expect(mockDbUpdateSet).toHaveBeenCalledTimes(1);
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent", sentAt: expect.any(Date) })
    );
    // the claim must win before the first Graph call
    expect(mockDbUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockAxiosPost.mock.invocationCallOrder[0]
    );
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/sendMail"
    );
    expect(mockDeleteScheduledEmail).toHaveBeenCalledTimes(1);
    expect(mockDeleteScheduledEmail).toHaveBeenCalledWith(42);
  });

  it("throws 409 and sends nothing when the claim finds no pending row", async () => {
    mockClaimReturning.mockResolvedValue([]);

    await expect(sendOutlookEmail({ ...baseInput, id: 42 })).rejects.toThrow(
      "Scheduled email was already sent or cancelled"
    );
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("releases the claim as failed and does not delete when sending fails", async () => {
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendOutlookEmail({ ...baseInput, id: 42 })).rejects.toThrow(
      "graph down"
    );
    expect(mockDbUpdateSet).toHaveBeenCalledTimes(2);
    expect(mockDbUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "graph down",
    });
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("stores the Graph error message when the send fails with an axios error", async () => {
    mockAxiosPost.mockRejectedValue({
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: {
        data: { error: { message: "InvalidAuthenticationToken" } },
      },
    });

    await expect(
      sendOutlookEmail({ ...baseInput, id: 42 })
    ).rejects.toBeTruthy();
    expect(mockDbUpdateSet).toHaveBeenLastCalledWith({
      status: "failed",
      errorMessage: "InvalidAuthenticationToken",
    });
  });

  it("does not revert the claim when sending fails without an id", async () => {
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendOutlookEmail(baseInput)).rejects.toThrow("graph down");
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("does not revert the claim when cleanup fails after a successful send", async () => {
    mockDeleteScheduledEmail.mockRejectedValue(new Error("cleanup failed"));

    await expect(sendOutlookEmail({ ...baseInput, id: 42 })).rejects.toThrow(
      "cleanup failed"
    );
    // only the claim update ran — no "failed" revert for a delivered email
    expect(mockDbUpdateSet).toHaveBeenCalledTimes(1);
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sent" })
    );
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-numeric id", async () => {
    await expect(
      sendOutlookEmail({
        ...baseInput,
        id: "not-a-number" as unknown as number,
      })
    ).rejects.toThrow("id must be a number");
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("sends attachments via a draft and still deletes the scheduled email", async () => {
    const result = await sendOutlookEmail({
      ...baseInput,
      id: 7,
      attachments: [
        {
          name: "doc.pdf",
          data: Buffer.from("pdf-bytes").toString("base64"),
          mimeType: "application/pdf",
        },
      ],
    });

    expect(result).toEqual({ success: true });
    const urls = mockAxiosPost.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toEqual([
      "https://graph.microsoft.com/v1.0/me/messages",
      "https://graph.microsoft.com/v1.0/me/messages/draft-1/attachments",
      "https://graph.microsoft.com/v1.0/me/messages/draft-1/send",
    ]);
    expect(mockDeleteScheduledEmail).toHaveBeenCalledWith(7);
  });
});
