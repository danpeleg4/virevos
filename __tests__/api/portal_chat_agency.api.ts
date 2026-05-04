import {
  DELETE,
  GET,
  PATCH,
  POST,
} from "@/app/api/portal-chat/[clientId]/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const makeGetRequest = (clientId: string) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`);

const makePostRequest = (clientId: string, body: object) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makePatchRequest = (clientId: string, body: object) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeDeleteRequest = (clientId: string) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`, {
    method: "DELETE",
  });

const makeParams = (clientId: string) => Promise.resolve({ clientId });

const mockUser = { id: "user_1" };

const mockPortal = {
  id: 1,
  clientId: 10,
  userId: "user_1",
  token: "tok",
  enabled: true,
};

function mockPortalLookup(rows: object[]) {
  const mockLimit = jest.fn().mockResolvedValue(rows);
  const mockWhere = jest.fn(() => ({ limit: mockLimit }));
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  (db.select as jest.Mock).mockReturnValueOnce({ from: mockFrom });
}

function mockMessagesSelect(rows: object[]) {
  const mockOrderBy = jest.fn().mockResolvedValue(rows);
  const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  (db.select as jest.Mock).mockReturnValueOnce({ from: mockFrom });
}

function mockUpdateChain() {
  const mockWhere = jest.fn().mockResolvedValue(undefined);
  const mockSet = jest.fn(() => ({ where: mockWhere }));
  (db.update as jest.Mock).mockReturnValueOnce({ set: mockSet });
}

function mockLatestClientMessageSelect(rows: object[]) {
  const mockLimit = jest.fn().mockResolvedValue(rows);
  const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
  const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  (db.select as jest.Mock).mockReturnValueOnce({ from: mockFrom });
}

function mockDeleteChain() {
  const mockWhere = jest.fn().mockResolvedValue(undefined);
  (db.delete as jest.Mock).mockReturnValueOnce({ where: mockWhere });
}

describe("GET /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(401);
  });

  it("returns 400 when clientId is not numeric", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const res = await GET(makeGetRequest("abc"), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when no portal exists for this client/user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([]);
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(404);
  });

  it("returns messages and marks client messages read", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    const created = new Date("2026-05-01T10:00:00Z");
    mockMessagesSelect([
      {
        id: 1,
        senderType: "client",
        body: "From client",
        readAt: null,
        createdAt: created,
      },
    ]);
    mockUpdateChain();

    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.portalId).toBe(1);
    expect(json.messages).toHaveLength(1);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when message is empty", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const res = await POST(makePostRequest("10", { message: "   " }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when portal doesn't belong to user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([]);
    const res = await POST(makePostRequest("10", { message: "hi" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(404);
  });

  it("inserts an agency message and returns it", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    const inserted = {
      id: 7,
      senderType: "agency",
      body: "Reply",
      readAt: null,
      createdAt: new Date("2026-05-01T12:00:00Z"),
    };
    const mockReturning = jest.fn().mockResolvedValue([inserted]);
    const mockValues = jest.fn(() => ({ returning: mockReturning }));
    (db.insert as jest.Mock).mockReturnValueOnce({ values: mockValues });

    const res = await POST(makePostRequest("10", { message: "Reply" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatchObject({
      id: 7,
      senderType: "agency",
      body: "Reply",
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: 1,
        clientId: 10,
        userId: "user_1",
        senderType: "agency",
        body: "Reply",
      })
    );
  });
});

describe("PATCH /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for unknown action", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const res = await PATCH(makePatchRequest("10", { action: "yeet" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when portal doesn't belong to user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([]);
    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(404);
  });

  it("stars the conversation", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn(() => ({ where: mockWhere }));
    (db.update as jest.Mock).mockReturnValueOnce({ set: mockSet });

    const res = await PATCH(makePatchRequest("10", { action: "star" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith({ chatStarred: true });
  });

  it("archives the conversation", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn(() => ({ where: mockWhere }));
    (db.update as jest.Mock).mockReturnValueOnce({ set: mockSet });

    const res = await PATCH(makePatchRequest("10", { action: "archive" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith({ chatArchived: true });
  });

  it("marks the latest client message as unread", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    mockLatestClientMessageSelect([{ id: 42 }]);
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn(() => ({ where: mockWhere }));
    (db.update as jest.Mock).mockReturnValueOnce({ set: mockSet });

    const res = await PATCH(makePatchRequest("10", { action: "markUnread" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith({ readAt: null });
  });

  it("is a no-op when there are no client messages to mark unread", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    mockLatestClientMessageSelect([]);

    const res = await PATCH(makePatchRequest("10", { action: "markUnread" }), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/portal-chat/[clientId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when clientId is invalid", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const res = await DELETE(makeDeleteRequest("abc"), {
      params: makeParams("abc"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when portal doesn't belong to user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([]);
    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(404);
  });

  it("wipes the messages and resets conversation flags", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockPortalLookup([mockPortal]);
    mockDeleteChain();
    const mockWhere = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn(() => ({ where: mockWhere }));
    (db.update as jest.Mock).mockReturnValueOnce({ set: mockSet });

    const res = await DELETE(makeDeleteRequest("10"), {
      params: makeParams("10"),
    });
    expect(res.status).toBe(200);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith({
      chatStarred: false,
      chatArchived: false,
    });
  });
});
