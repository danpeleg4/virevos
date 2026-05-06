import { GET } from "@/app/api/portal-chat/[clientId]/route";
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
    update: jest.fn(),
  },
}));

const makeGetRequest = (clientId: string) =>
  new NextRequest(`http://localhost/api/portal-chat/${clientId}`);

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
