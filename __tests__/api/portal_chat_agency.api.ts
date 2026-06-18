import { GET } from "@/app/api/portal-chat/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
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
    mockPortalLookup([]);
    const res = await GET(makeGetRequest("10"), { params: makeParams("10") });
    expect(res.status).toBe(404);
  });

  it("returns messages and marks client messages read", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
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
