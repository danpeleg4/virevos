import { GET, POST } from "@/app/api/portal/[token]/chat/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

const makeGetRequest = (token: string) =>
  new NextRequest(`http://localhost/api/portal/${token}/chat`);

const makePostRequest = (token: string, body: object) =>
  new NextRequest(`http://localhost/api/portal/${token}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const makeParams = (token: string) => Promise.resolve({ token });

const mockPortal = {
  id: 1,
  clientId: 10,
  userId: "user_1",
  token: "test-token",
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

describe("GET /api/portal/[token]/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 404 when portal token is unknown", async () => {
    mockPortalLookup([]);
    const res = await GET(makeGetRequest("missing"), {
      params: makeParams("missing"),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when portal is disabled", async () => {
    mockPortalLookup([{ ...mockPortal, enabled: false }]);
    const res = await GET(makeGetRequest("test-token"), {
      params: makeParams("test-token"),
    });
    expect(res.status).toBe(404);
  });

  it("returns messages and marks agency messages as read", async () => {
    mockPortalLookup([mockPortal]);
    const created = new Date("2026-05-01T10:00:00Z");
    mockMessagesSelect([
      {
        id: 1,
        senderType: "agency",
        body: "Hi there",
        readAt: null,
        createdAt: created,
      },
      {
        id: 2,
        senderType: "client",
        body: "Hello back",
        readAt: created,
        createdAt: created,
      },
    ]);
    mockUpdateChain();

    const res = await GET(makeGetRequest("test-token"), {
      params: makeParams("test-token"),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toHaveLength(2);
    expect(json.messages[0]).toMatchObject({
      id: 1,
      senderType: "agency",
      body: "Hi there",
      readAt: null,
    });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/portal/[token]/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when message is empty", async () => {
    const res = await POST(makePostRequest("test-token", { message: "  " }), {
      params: makeParams("test-token"),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 5000 chars", async () => {
    const res = await POST(
      makePostRequest("test-token", { message: "x".repeat(5001) }),
      { params: makeParams("test-token") }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when portal token is unknown", async () => {
    mockPortalLookup([]);
    const res = await POST(makePostRequest("missing", { message: "hi" }), {
      params: makeParams("missing"),
    });
    expect(res.status).toBe(404);
  });

  it("inserts a client message and returns it", async () => {
    mockPortalLookup([mockPortal]);
    const inserted = {
      id: 99,
      senderType: "client",
      body: "Hello agency",
      readAt: null,
      createdAt: new Date("2026-05-01T11:00:00Z"),
    };
    const mockReturning = jest.fn().mockResolvedValue([inserted]);
    const mockValues = jest.fn(() => ({ returning: mockReturning }));
    (db.insert as jest.Mock).mockReturnValueOnce({ values: mockValues });

    const res = await POST(
      makePostRequest("test-token", { message: "Hello agency" }),
      { params: makeParams("test-token") }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatchObject({
      id: 99,
      senderType: "client",
      body: "Hello agency",
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: 1,
        clientId: 10,
        userId: "user_1",
        senderType: "client",
        body: "Hello agency",
      })
    );
  });
});
