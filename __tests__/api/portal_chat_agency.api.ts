import { DELETE, GET, PATCH, POST } from "@/app/api/portal-chat/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { NextRequest } from "next/server";
import {
  deletePortalChat,
  getPortalChatThread,
  sendAgencyChatMessage,
  updatePortalChat,
} from "@/lib/portal/portal_chat";
import { portalChatDrizzle } from "@db/portal_chat_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@db/portal_chat_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  portalChatDrizzle: { __sentinel: "portalChatDrizzle" },
}));

vi.mock("@/lib/portal_chat", () => ({
  deletePortalChat: vi.fn(),
  getPortalChatThread: vi.fn(),
  sendAgencyChatMessage: vi.fn(),
  updatePortalChat: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const makeGetRequest = (clientId: string) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`);

const makeParams = (clientId: string) => Promise.resolve({ id: clientId });

const mockUser = { id: "user_1" };

describe("GET /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(401);
  });

  it("returns 400 when clientId is not numeric", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const res = await GET(makeGetRequest("abc"), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when no portal exists for this client/user", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (getPortalChatThread as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found", 404)
    );
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(404);
  });

  it("returns the thread from the wired portalChatDrizzle instance", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const thread = {
      portalId: 1,
      messages: [
        {
          id: 1,
          senderType: "client",
          body: "From client",
          readAt: null,
          createdAt: "2026-05-01T10:00:00.000Z",
        },
      ],
    };
    (getPortalChatThread as Mock).mockResolvedValueOnce(thread);

    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(thread);
    expect(getPortalChatThread).toHaveBeenCalledWith(10, portalChatDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (getPortalChatThread as Mock).mockRejectedValueOnce(new Error("db down"));
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(500);
  });
});

const makePostRequest = (clientId: string, body: unknown) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
  });

  it("returns 401 when not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
    expect(sendAgencyChatMessage).not.toHaveBeenCalled();
  });

  it("returns 400 when clientId is not numeric", async () => {
    const res = await POST(makePostRequest("abc", { message: "hi" }), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
    expect(sendAgencyChatMessage).not.toHaveBeenCalled();
  });

  it("sends the message via the wired portalChatDrizzle instance", async () => {
    const message = { id: 1, senderType: "agency", body: "hi" };
    (sendAgencyChatMessage as Mock).mockResolvedValueOnce(message);

    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(message);
    expect(sendAgencyChatMessage).toHaveBeenCalledWith(
      10,
      "hi",
      portalChatDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (sendAgencyChatMessage as Mock).mockRejectedValueOnce(
      new ValidationError("Portal not found", 404)
    );

    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Portal not found" });
  });

  it("returns 500 when the lib call throws", async () => {
    (sendAgencyChatMessage as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to send message" });
  });
});

const makePatchRequest = (clientId: string, body: unknown) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
  });

  it("returns 401 when not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
    expect(updatePortalChat).not.toHaveBeenCalled();
  });

  it("returns 400 when clientId is not numeric", async () => {
    const res = await PATCH(makePatchRequest("abc", { action: "star" }), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
    expect(updatePortalChat).not.toHaveBeenCalled();
  });

  it("updates the chat via the wired portalChatDrizzle instance", async () => {
    (updatePortalChat as Mock).mockResolvedValueOnce({ success: true });

    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(updatePortalChat).toHaveBeenCalledWith(
      10,
      "star",
      portalChatDrizzle
    );
  });

  it("propagates a ValidationError status", async () => {
    (updatePortalChat as Mock).mockRejectedValueOnce(
      new ValidationError("action must be one of ...", 400)
    );

    const res = await PATCH(makePatchRequest("10", { action: "bogus" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(400);
  });

  it("returns 500 when the lib call throws", async () => {
    (updatePortalChat as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to update chat" });
  });
});

const makeDeleteRequest = (clientId: string) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "DELETE",
  });

describe("DELETE /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
  });

  it("returns 401 when not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
    expect(deletePortalChat).not.toHaveBeenCalled();
  });

  it("returns 400 when clientId is not numeric", async () => {
    const res = await DELETE(makeDeleteRequest("abc"), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
    expect(deletePortalChat).not.toHaveBeenCalled();
  });

  it("deletes the chat via the wired portalChatDrizzle instance", async () => {
    (deletePortalChat as Mock).mockResolvedValueOnce({ success: true });

    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(deletePortalChat).toHaveBeenCalledWith(10, portalChatDrizzle);
  });

  it("returns 500 when the lib call throws", async () => {
    (deletePortalChat as Mock).mockRejectedValueOnce(new Error("boom"));

    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to delete chat" });
  });
});
