import { GET, POST } from "@/app/api/portal/[token]/chat/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
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
  const mockLimit = vi.fn().mockResolvedValue(rows);
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  (db.select as Mock).mockReturnValueOnce({ from: mockFrom });
}

function mockMessagesSelect(rows: object[]) {
  const mockOrderBy = vi.fn().mockResolvedValue(rows);
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  (db.select as Mock).mockReturnValueOnce({ from: mockFrom });
}

function mockUpdateChain() {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  (db.update as Mock).mockReturnValueOnce({ set: mockSet });
}

describe("GET /api/portal/[token]/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.clearAllMocks();
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
    const mockReturning = vi.fn().mockResolvedValue([inserted]);
    const mockValues = vi.fn(() => ({ returning: mockReturning }));
    (db.insert as Mock).mockReturnValueOnce({ values: mockValues });

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
