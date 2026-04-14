import { GET, PATCH, DELETE } from "@/app/api/outlook/messages/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("axios");
jest.mock("@/lib/outlook_access", () => ({
  getFreshOutlookAccessToken: jest.fn().mockResolvedValue("token_123"),
}));

import axios from "axios";

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

function makeRequest(method = "GET", body?: unknown): Request {
  return new Request("http://localhost/api/outlook/messages/1", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function mockDbFound() {
  (db.select as jest.Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([mockEmail]),
      }),
    }),
  });
}

function mockDbEmpty() {
  (db.select as jest.Mock).mockReturnValue({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
      }),
    }),
  });
}

const params = Promise.resolve({ id: "1" });

describe("GET /api/outlook/messages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when message not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbEmpty();
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(404);
  });

  it("returns the message when found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.outlookId).toBe("outlook_msg_1");
  });
});

describe("PATCH /api/outlook/messages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { isRead: true }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbEmpty();
    const res = await PATCH(makeRequest("PATCH", { action: "markRead" }), {
      params,
    });
    expect(res.status).toBe(404);
  });

  it("updates isRead in DB and syncs to Graph", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const whereMock = jest.fn().mockResolvedValue(undefined);
    const setMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.update as jest.Mock).mockReturnValue({ set: setMock });
    (axios.patch as jest.Mock).mockResolvedValue({});

    const res = await PATCH(makeRequest("PATCH", { action: "markRead" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ isRead: true })
    );
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining("outlook_msg_1"),
      expect.objectContaining({ isRead: true }),
      expect.any(Object)
    );
  });

  it("updates isStarred and sets Graph flag", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const whereMock = jest.fn().mockResolvedValue(undefined);
    const setMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.update as jest.Mock).mockReturnValue({ set: setMock });
    (axios.patch as jest.Mock).mockResolvedValue({});

    const res = await PATCH(makeRequest("PATCH", { action: "star" }), {
      params,
    });
    expect(res.status).toBe(200);
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining("outlook_msg_1"),
      expect.objectContaining({ flag: { flagStatus: "flagged" } }),
      expect.any(Object)
    );
  });

  it("succeeds even when Graph sync fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const whereMock = jest.fn().mockResolvedValue(undefined);
    const setMock = jest.fn().mockReturnValue({ where: whereMock });
    (db.update as jest.Mock).mockReturnValue({ set: setMock });
    (axios.patch as jest.Mock).mockRejectedValue(new Error("Graph error"));
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await PATCH(makeRequest("PATCH", { action: "markRead" }), {
      params,
    });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/outlook/messages/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when message not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbEmpty();
    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(404);
  });

  it("deletes from DB and Graph", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const whereMock = jest.fn().mockResolvedValue(undefined);
    (db.delete as jest.Mock).mockReturnValue({ where: whereMock });
    (axios.delete as jest.Mock).mockResolvedValue({});

    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalled();
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining("outlook_msg_1"),
      expect.any(Object)
    );
  });

  it("succeeds even when Graph delete fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    mockDbFound();
    const whereMock = jest.fn().mockResolvedValue(undefined);
    (db.delete as jest.Mock).mockReturnValue({ where: whereMock });
    (axios.delete as jest.Mock).mockRejectedValue(new Error("Graph error"));
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const res = await DELETE(makeRequest("DELETE"), { params });
    expect(res.status).toBe(200);
  });
});
