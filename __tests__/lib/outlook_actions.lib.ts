import type { SendOutlookEmailInput } from "@/lib/outlook/outlook_actions";

const mockGetCurrentUser = vi.fn();
const mockGetFreshOutlookAccessToken = vi.fn();
const mockDeleteScheduledEmail = vi.fn();
const mockAxiosPost = vi.fn();
const mockAxiosPut = vi.fn();

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

vi.mock("@db/db", () => ({ db: {} }));
vi.mock("@db/schema", () => ({ outlookEmails: {} }));
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

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue({ id: "user_1" });
  mockGetFreshOutlookAccessToken.mockResolvedValue("token-123");
  mockAxiosPost.mockResolvedValue({ data: { id: "draft-1" } });
  mockAxiosPut.mockResolvedValue({ data: {} });
  mockDeleteScheduledEmail.mockResolvedValue({ success: true });
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
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("deletes the scheduled email after sending when an id is provided", async () => {
    const result = await sendOutlookEmail({ ...baseInput, id: 42 });

    expect(result).toEqual({ success: true });
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/me/sendMail"
    );
    expect(mockDeleteScheduledEmail).toHaveBeenCalledTimes(1);
    expect(mockDeleteScheduledEmail).toHaveBeenCalledWith(42);
  });

  it("does not delete the scheduled email when sending fails", async () => {
    mockAxiosPost.mockRejectedValue(new Error("graph down"));

    await expect(sendOutlookEmail({ ...baseInput, id: 42 })).rejects.toThrow(
      "graph down"
    );
    expect(mockDeleteScheduledEmail).not.toHaveBeenCalled();
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
