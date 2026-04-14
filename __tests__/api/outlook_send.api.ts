import { POST } from "@/app/api/outlook/send/route";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("axios");
jest.mock("@/lib/outlook_access", () => ({
  getFreshOutlookAccessToken: jest.fn(),
}));
jest.mock("@/lib/storage", () => ({
  downloadFile: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({
  FILES_BUCKET: "files",
}));

import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";
import { downloadFile } from "@/lib/storage";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/outlook/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/outlook/send", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 403 if Outlook is not connected", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      makeRequest({ to: "a@b.com", subject: "Hi", bodyHtml: "<p>Hi</p>" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    const res = await POST(makeRequest({ to: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("sends a new email via /me/sendMail", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        toName: "Recipient",
        subject: "Hello",
        bodyHtml: "<p>Hello there</p>",
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/me/sendMail"),
      expect.objectContaining({
        message: expect.objectContaining({
          subject: "Hello",
          toRecipients: [
            {
              emailAddress: {
                address: "recipient@example.com",
                name: "Recipient",
              },
            },
          ],
        }),
        saveToSentItems: true,
      }),
      expect.any(Object)
    );
  });

  it("sends with cc recipients", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        cc: ["cc@example.com"],
      })
    );

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/me/sendMail"),
      expect.objectContaining({
        message: expect.objectContaining({
          ccRecipients: [
            {
              emailAddress: {
                address: "cc@example.com",
                name: "cc@example.com",
              },
            },
          ],
        }),
      }),
      expect.any(Object)
    );
  });

  it("sends a reply via /me/messages/{id}/reply", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

    const res = await POST(
      makeRequest({
        to: "sender@example.com",
        subject: "Re: Hello",
        bodyHtml: "<p>Reply body</p>",
        replyToOutlookId: "outlook_msg_abc",
      })
    );

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/me/messages/outlook_msg_abc/reply"),
      expect.objectContaining({ message: expect.any(Object) }),
      expect.any(Object)
    );
  });

  it("returns Graph error status on send failure", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (axios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 429,
        data: { error: { message: "Too many requests" } },
      },
    });
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
      })
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
  });

  // ── Attachment tests ─────────────────────────────────────────────────────────

  it("sends a new email with a small attachment via draft flow", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");

    const draftId = "draft_001";
    // POST /me/messages → draft, POST attachments, POST send
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { id: draftId } }) // create draft
      .mockResolvedValueOnce({ data: {} }) // add attachment
      .mockResolvedValueOnce({ data: {} }); // send draft

    const smallBase64 = Buffer.alloc(100).toString("base64"); // 100 bytes

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "With attachment",
        bodyHtml: "<p>See attached</p>",
        attachments: [
          { name: "file.txt", data: smallBase64, mimeType: "text/plain" },
        ],
      })
    );

    expect(res.status).toBe(200);

    // Draft creation
    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/me/messages"),
      expect.objectContaining({ subject: "With attachment" }),
      expect.any(Object)
    );
    // Direct attachment
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`/me/messages/${draftId}/attachments`),
      expect.objectContaining({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: "file.txt",
        contentBytes: smallBase64,
      }),
      expect.any(Object)
    );
    // Send draft
    expect(axios.post).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(`/me/messages/${draftId}/send`),
      {},
      expect.any(Object)
    );
  });

  it("sends a new email with a large attachment via upload session", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");

    const draftId = "draft_002";
    const uploadUrl = "https://upload.microsoft.com/session/abc";

    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { id: draftId } }) // create draft
      .mockResolvedValueOnce({ data: { uploadUrl } }) // createUploadSession
      .mockResolvedValueOnce({ data: {} }); // send draft
    (axios.put as jest.Mock).mockResolvedValue({ status: 200 }); // chunk upload

    // 4 MB file (> 3 MB threshold)
    const largeBase64 = Buffer.alloc(4 * 1024 * 1024).toString("base64");

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "Large file",
        bodyHtml: "<p>Big attachment</p>",
        attachments: [
          {
            name: "big.bin",
            data: largeBase64,
            mimeType: "application/octet-stream",
          },
        ],
      })
    );

    expect(res.status).toBe(200);

    // createUploadSession
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        `/me/messages/${draftId}/attachments/createUploadSession`
      ),
      expect.objectContaining({
        AttachmentItem: expect.objectContaining({
          attachmentType: "file",
          name: "big.bin",
          size: 4 * 1024 * 1024,
        }),
      }),
      expect.any(Object)
    );

    // Chunk upload to session URL
    expect(axios.put).toHaveBeenCalledWith(
      uploadUrl,
      expect.any(Buffer),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Range": expect.stringMatching(/^bytes \d+-\d+\/\d+$/),
        }),
      })
    );

    // Send draft
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`/me/messages/${draftId}/send`),
      {},
      expect.any(Object)
    );
  });

  it("sends a reply with a small attachment via createReply draft flow", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");

    const replyDraftId = "reply_draft_001";
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { id: replyDraftId } }) // createReply
      .mockResolvedValueOnce({ data: {} }) // add attachment
      .mockResolvedValueOnce({ data: {} }); // send draft

    const smallBase64 = Buffer.alloc(50).toString("base64");

    const res = await POST(
      makeRequest({
        to: "sender@example.com",
        subject: "Re: Hello",
        bodyHtml: "<p>Reply with file</p>",
        replyToOutlookId: "original_msg_id",
        attachments: [
          { name: "reply.pdf", data: smallBase64, mimeType: "application/pdf" },
        ],
      })
    );

    expect(res.status).toBe(200);

    // createReply
    expect(axios.post).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/me/messages/original_msg_id/createReply"),
      expect.objectContaining({ message: expect.any(Object) }),
      expect.any(Object)
    );
    // Direct attachment on reply draft
    expect(axios.post).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`/me/messages/${replyDraftId}/attachments`),
      expect.objectContaining({ name: "reply.pdf" }),
      expect.any(Object)
    );
    // Send reply draft
    expect(axios.post).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(`/me/messages/${replyDraftId}/send`),
      {},
      expect.any(Object)
    );
  });

  it("sends email with a path-based (app file) attachment", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (downloadFile as jest.Mock).mockResolvedValue(Buffer.alloc(200));

    const draftId = "draft_003";
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { id: draftId } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: {} });

    const res = await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "App file",
        bodyHtml: "<p>From files</p>",
        attachments: [
          {
            name: "report.pdf",
            path: "projects/123/report.pdf",
            mimeType: "application/pdf",
          },
        ],
      })
    );

    expect(res.status).toBe(200);
    expect(downloadFile).toHaveBeenCalledWith(
      "files",
      "projects/123/report.pdf"
    );
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(`/me/messages/${draftId}/attachments`),
      expect.objectContaining({ name: "report.pdf" }),
      expect.any(Object)
    );
  });

  it("appends URL attachments as links in the email body", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (getFreshOutlookAccessToken as jest.Mock).mockResolvedValue("token_123");
    (axios.post as jest.Mock).mockResolvedValue({ status: 202 });

    await POST(
      makeRequest({
        to: "recipient@example.com",
        subject: "Link",
        bodyHtml: "<p>See link</p>",
        attachments: [{ name: "Document", url: "https://example.com/doc.pdf" }],
      })
    );

    // Uses sendMail (no file attachments → fast path)
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/me/sendMail"),
      expect.objectContaining({
        message: expect.objectContaining({
          body: expect.objectContaining({
            content: expect.stringContaining("https://example.com/doc.pdf"),
          }),
        }),
      }),
      expect.any(Object)
    );
  });
});
