import { GET, POST, DELETE } from "@/app/api/scheduled-emails/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  createScheduledEmail,
  deleteScheduledEmail,
  sendScheduledEmailNow,
} from "@/lib/scheduled_emails";
import { DrizzleInstance } from "@db/db";
import { scheduledEmailService } from "@/api_client/axios_api_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { orderBy } = vi.hoisted(() => ({ orderBy: vi.fn() }));

vi.mock("@db/db", () => ({
  __esModule: true,
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ orderBy }),
      }),
    }),
  },
  // sentinel — the route must pass this exact instance into the lib fns
  DrizzleInstance: { __sentinel: "DrizzleInstance" },
}));

vi.mock("@/lib/scheduled_emails", () => ({
  createScheduledEmail: vi.fn(),
  deleteScheduledEmail: vi.fn(),
  sendScheduledEmailNow: vi.fn(),
}));

vi.mock("@/api_client/axios_api_client", () => ({
  // sentinel — the route must pass this exact service into sendScheduledEmailNow
  scheduledEmailService: { __sentinel: "scheduledEmailService" },
}));

const user = { id: "user_1" };

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/scheduled-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const deleteRequest = (query = "") =>
  new Request(`http://localhost/api/scheduled-emails${query}`, {
    method: "DELETE",
  });

beforeEach(() => {
  (getCurrentUser as Mock).mockResolvedValue(user);
});

describe("GET /api/scheduled-emails", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(orderBy).not.toHaveBeenCalled();
  });

  it("should return scheduled emails for authenticated user", async () => {
    const rows = [
      { id: 1, subject: "Quarterly review", status: "pending" },
      { id: 2, subject: "Kickoff call", status: "sent" },
    ];
    orderBy.mockResolvedValueOnce(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ scheduledEmails: rows });
  });

  it("returns 500 when the query fails", async () => {
    orderBy.mockRejectedValueOnce(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch scheduled emails",
    });
  });
});

describe("POST /api/scheduled-emails", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ type: "send-now", data: 1 }));

    expect(res.status).toBe(401);
    expect(sendScheduledEmailNow).not.toHaveBeenCalled();
  });

  it("dispatches send-now to sendScheduledEmailNow with the wired deps", async () => {
    (sendScheduledEmailNow as Mock).mockResolvedValue({ success: true });

    const res = await POST(postRequest({ type: "send-now", data: 7 }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(sendScheduledEmailNow).toHaveBeenCalledTimes(1);
    expect(sendScheduledEmailNow).toHaveBeenCalledWith(
      7,
      DrizzleInstance,
      scheduledEmailService
    );
    expect(createScheduledEmail).not.toHaveBeenCalled();
  });

  it("dispatches schedule to createScheduledEmail with the wired db", async () => {
    (createScheduledEmail as Mock).mockResolvedValue(undefined);
    const input = {
      toEmail: "client@example.com",
      subject: "Kickoff call",
      bodyHtml: "<p>Hi</p>",
      scheduledAt: "2026-07-20T09:00:00.000Z",
    };

    const res = await POST(postRequest({ type: "schedule", data: input }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(createScheduledEmail).toHaveBeenCalledTimes(1);
    expect(createScheduledEmail).toHaveBeenCalledWith(input, DrizzleInstance);
    expect(sendScheduledEmailNow).not.toHaveBeenCalled();
  });

  // Documents current behavior: an unrecognized type is silently ignored.
  // Arguably this should be a 400 instead.
  it("ignores an unknown type without dispatching", async () => {
    const res = await POST(postRequest({ type: "bogus", data: 1 }));

    expect(res.status).toBe(200);
    expect(sendScheduledEmailNow).not.toHaveBeenCalled();
    expect(createScheduledEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when the lib call throws", async () => {
    (sendScheduledEmailNow as Mock).mockRejectedValueOnce(
      new Error("already sent")
    );

    const res = await POST(postRequest({ type: "send-now", data: 7 }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to create scheduled email",
    });
  });

  it("returns 500 when the body is not valid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/scheduled-emails", {
        method: "POST",
        body: "not-json",
      })
    );

    expect(res.status).toBe(500);
    expect(sendScheduledEmailNow).not.toHaveBeenCalled();
    expect(createScheduledEmail).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/scheduled-emails", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE(deleteRequest("?id=1"));

    expect(res.status).toBe(401);
    expect(deleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when the id parameter is missing", async () => {
    const res = await DELETE(deleteRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing id parameter" });
    expect(deleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when the id parameter is not a number", async () => {
    const res = await DELETE(deleteRequest("?id=abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id parameter" });
    expect(deleteScheduledEmail).not.toHaveBeenCalled();
  });

  it("deletes the scheduled email by id with the wired db", async () => {
    (deleteScheduledEmail as Mock).mockResolvedValue({ success: true });

    const res = await DELETE(deleteRequest("?id=42"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteScheduledEmail).toHaveBeenCalledTimes(1);
    expect(deleteScheduledEmail).toHaveBeenCalledWith(42, DrizzleInstance);
  });

  it("returns 500 when the lib call throws", async () => {
    (deleteScheduledEmail as Mock).mockRejectedValueOnce(
      new Error("not yours")
    );

    const res = await DELETE(deleteRequest("?id=42"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to delete scheduled email",
    });
  });
});
