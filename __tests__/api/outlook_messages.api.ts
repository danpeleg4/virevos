import { DELETE, GET, PATCH } from "@/app/api/outlook/messages/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteOutlookMessage,
  updateOutlookMessage,
} from "@/lib/outlook/outlook_actions";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/outlook/outlook_actions", () => ({
  deleteOutlookMessage: vi.fn(),
  updateOutlookMessage: vi.fn(),
}));

vi.mock("@db/outlook_db", () => ({
  outlookDrizzle: {
    __sentinel: "outlookDrizzle",
    getEmailById: vi.fn(),
  },
}));

vi.mock("@/api_client/ms_graph/graph_auth_service", () => ({
  graphAuthService: { __sentinel: "graphAuthService" },
}));

vi.mock("@/api_client/ms_graph/graph_mail_service", () => ({
  graphMailService: { __sentinel: "graphMailService" },
}));

const mockEmail = {
  id: 1,
  outlookId: "outlook_msg_1",
  conversationId: "conv_1",
  subject: "Hello",
  snippet: "Hi there",
  fromEmail: "sender@example.com",
  fromName: "Sender",
  toEmails: ["me@example.com"],
  ccEmails: [],
  bodyHtml: "<p>Hi there</p>",
  bodyText: "Hi there",
  isRead: false,
  isStarred: false,
  isArchived: false,
  isSent: false,
  sentAt: new Date("2026-04-01T10:00:00Z"),
  clientId: null,
  userId: "user_1",
  createdAt: new Date(),
};

const params = Promise.resolve({ id: "1" });

const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/outlook/messages/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
  (outlookDrizzle.getEmailById as Mock).mockResolvedValue([mockEmail]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/outlook/messages/[id]", () => {
  it("returns 401 if not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when message not found", async () => {
    (outlookDrizzle.getEmailById as Mock).mockResolvedValueOnce([]);
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(404);
  });

  it("returns the message when found", async () => {
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.outlookId).toBe("outlook_msg_1");
  });
});

describe("PATCH /api/outlook/messages/[id]", () => {
  it("dispatches the action to updateOutlookMessage with the wired deps", async () => {
    (updateOutlookMessage as Mock).mockResolvedValueOnce({ success: true });

    const res = await PATCH(patchRequest({ action: "star" }), { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(updateOutlookMessage).toHaveBeenCalledWith(
      1,
      "star",
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("propagates a ValidationError status", async () => {
    (updateOutlookMessage as Mock).mockRejectedValueOnce(
      new ValidationError("Not found", 404)
    );

    const res = await PATCH(patchRequest({ action: "star" }), { params });

    expect(res.status).toBe(404);
  });

  it("returns 500 when the update fails", async () => {
    (updateOutlookMessage as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await PATCH(patchRequest({ action: "star" }), { params });

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/outlook/messages/[id]", () => {
  it("deletes through the lib fn with the wired deps", async () => {
    (deleteOutlookMessage as Mock).mockResolvedValueOnce({ success: true });

    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deleteOutlookMessage).toHaveBeenCalledWith(
      1,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
  });

  it("propagates a ValidationError status", async () => {
    (deleteOutlookMessage as Mock).mockRejectedValueOnce(
      new ValidationError("Not found", 404)
    );

    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(404);
  });

  it("returns 500 when the delete fails", async () => {
    (deleteOutlookMessage as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(500);
  });
});
