import { createDemoRequest, type DemoRequestInput } from "@/lib/demo_requests";
import {
  canonicalDemoRequestRow,
  makeFakeDemoRequestsDb,
} from "../fakes/fake_demo_requests_db";
import { makeFakeResendClient } from "../fakes/fake_resend_client";
import { rateLimitHeaders } from "@/lib/util/rate_limit";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

vi.mock("@/lib/util/rate_limit", () => ({
  rateLimitHeaders: vi.fn(() => false),
}));

const demoRequestsDb = makeFakeDemoRequestsDb();
const resendClient = makeFakeResendClient();

const validInput: DemoRequestInput = {
  name: "Jane Prospect",
  email: "jane@prospect.com",
  company: "Prospect Inc",
  message: "Interested in a demo next week",
};

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  (rateLimitHeaders as Mock).mockReturnValue(false);
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("createDemoRequest", () => {
  it("persists the request and sends a notification email on success", async () => {
    const result = await createDemoRequest(
      validInput,
      demoRequestsDb,
      resendClient
    );

    expect(result).toEqual({ success: true, id: canonicalDemoRequestRow.id });
    expect(demoRequestsDb.insertDemoRequest).toHaveBeenCalledWith({
      name: "Jane Prospect",
      email: "jane@prospect.com",
      company: "Prospect Inc",
      message: "Interested in a demo next week",
      status: "pending",
    });
    expect(resendClient.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "business@virevos.com",
        subject: expect.stringContaining("Jane Prospect"),
      })
    );
    expect(demoRequestsDb.setDemoRequestStatus).toHaveBeenCalledWith(
      canonicalDemoRequestRow.id,
      "notified",
      null
    );
  });

  it("omits optional fields when not provided", async () => {
    await createDemoRequest(
      { name: "Jane Prospect", email: "jane@prospect.com" },
      demoRequestsDb,
      resendClient
    );

    expect(demoRequestsDb.insertDemoRequest).toHaveBeenCalledWith({
      name: "Jane Prospect",
      email: "jane@prospect.com",
      company: null,
      message: null,
      status: "pending",
    });
  });

  it("still persists the request when the notification email fails", async () => {
    resendClient.sendEmail.mockRejectedValueOnce(new Error("resend down"));

    const result = await createDemoRequest(
      validInput,
      demoRequestsDb,
      resendClient
    );

    expect(result).toEqual({ success: true, id: canonicalDemoRequestRow.id });
    expect(demoRequestsDb.insertDemoRequest).toHaveBeenCalledTimes(1);
    expect(demoRequestsDb.setDemoRequestStatus).toHaveBeenCalledWith(
      canonicalDemoRequestRow.id,
      "notify_failed",
      "resend down"
    );
  });

  it("rejects an invalid email", async () => {
    await expect(
      createDemoRequest(
        { ...validInput, email: "not-an-email" },
        demoRequestsDb,
        resendClient
      )
    ).rejects.toThrow(/valid email/);
    expect(demoRequestsDb.insertDemoRequest).not.toHaveBeenCalled();
  });

  it("rejects a missing name", async () => {
    await expect(
      createDemoRequest(
        { ...validInput, name: "" },
        demoRequestsDb,
        resendClient
      )
    ).rejects.toThrow(/name is required/);
    expect(demoRequestsDb.insertDemoRequest).not.toHaveBeenCalled();
  });

  it("rejects a message exceeding the max length", async () => {
    await expect(
      createDemoRequest(
        { ...validInput, message: "a".repeat(5001) },
        demoRequestsDb,
        resendClient
      )
    ).rejects.toThrow(/exceeds max length/);
    expect(demoRequestsDb.insertDemoRequest).not.toHaveBeenCalled();
  });

  it("rejects submissions with a filled honeypot field", async () => {
    await expect(
      createDemoRequest(
        { ...validInput, honeypot: "I am a bot" },
        demoRequestsDb,
        resendClient
      )
    ).rejects.toThrow(/invalid submission/i);
    expect(demoRequestsDb.insertDemoRequest).not.toHaveBeenCalled();
  });

  it("rejects requests over the rate limit", async () => {
    (rateLimitHeaders as Mock).mockReturnValueOnce(true);

    await expect(
      createDemoRequest(validInput, demoRequestsDb, resendClient)
    ).rejects.toThrow(/too many requests/i);
    expect(demoRequestsDb.insertDemoRequest).not.toHaveBeenCalled();
  });
});
