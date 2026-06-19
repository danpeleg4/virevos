import { GET } from "@/app/api/portal/[token]/route";
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

vi.mock("@/lib/storage", () => ({
  downloadFile: vi.fn(),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

const makeGetRequest = (token: string) =>
  new NextRequest(`http://localhost/api/portal/${token}?type=chat`);

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
    expect(res?.status).toBe(404);
  });

  it("returns 404 when portal is disabled", async () => {
    mockPortalLookup([{ ...mockPortal, enabled: false }]);
    const res = await GET(makeGetRequest("test-token"), {
      params: makeParams("test-token"),
    });
    expect(res?.status).toBe(404);
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
    expect(res?.status).toBe(200);
    const json = await res?.json();
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
