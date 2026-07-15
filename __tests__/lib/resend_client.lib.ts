import { Resend } from "resend";
import { ResendApiClient } from "@/api_client/resend_client";

const send = vi.fn();
const fakeResend = { emails: { send } } as unknown as Resend;
const client = new ResendApiClient(fakeResend);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_FROM_EMAIL = undefined;
});

describe("ResendApiClient.sendEmail", () => {
  it("sends with the default from address", async () => {
    send.mockResolvedValueOnce({ data: { id: "msg-1" }, error: null });

    const result = await client.sendEmail({
      to: "jane@client.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    });

    expect(send).toHaveBeenCalledWith({
      from: "Virevos <noreply@virevos.com>",
      to: "jane@client.com",
      subject: "Hello",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ id: "msg-1" });
  });

  it("uses a custom from address when provided", async () => {
    send.mockResolvedValueOnce({ data: { id: "msg-2" }, error: null });

    await client.sendEmail({
      to: "jane@client.com",
      subject: "Hello",
      html: "<p>Hi</p>",
      from: "Custom <custom@virevos.com>",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Custom <custom@virevos.com>" })
    );
  });

  it("throws when Resend returns an error", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { message: "invalid recipient" },
    });

    await expect(
      client.sendEmail({ to: "bad", subject: "Hi", html: "<p>Hi</p>" })
    ).rejects.toThrow("Resend send failed: invalid recipient");
  });

  it("throws when no id is returned", async () => {
    send.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      client.sendEmail({
        to: "jane@client.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      })
    ).rejects.toThrow("Resend send failed: no id returned");
  });
});
