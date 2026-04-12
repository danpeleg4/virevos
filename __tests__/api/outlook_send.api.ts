import { POST } from "@/app/api/outlook/send/route";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("axios");
jest.mock("@/lib/outlook_access", () => ({
  getFreshOutlookAccessToken: jest.fn(),
}));

import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";

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
            { emailAddress: { address: "recipient@example.com", name: "Recipient" } },
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
            { emailAddress: { address: "cc@example.com", name: "cc@example.com" } },
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
});
