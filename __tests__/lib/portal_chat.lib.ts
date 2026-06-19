import { sendPortalChatMessage } from "@/lib/portal_chat";
import { db } from "@db/db";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const mockPortal = {
  id: 1,
  clientId: 10,
  userId: "user_1",
  token: "test-token",
  enabled: true,
};

function mockPortalLookup(rows: object[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  (db.select as Mock).mockReturnValue({ from });
}

describe("sendPortalChatMessage", () => {
  it("throws when message is empty/whitespace", async () => {
    await expect(sendPortalChatMessage("test-token", "   ")).rejects.toThrow(
      /message is required/i
    );
  });

  it("throws when message exceeds the max length", async () => {
    await expect(
      sendPortalChatMessage("test-token", "x".repeat(5001))
    ).rejects.toThrow(/exceeds max length/i);
  });

  it("throws Portal not found or disabled when token is unknown", async () => {
    mockPortalLookup([]);
    await expect(sendPortalChatMessage("missing", "hi")).rejects.toThrow(
      "Portal not found or disabled"
    );
  });

  it("throws Portal not found or disabled when portal is disabled", async () => {
    mockPortalLookup([{ ...mockPortal, enabled: false }]);
    await expect(sendPortalChatMessage("test-token", "hi")).rejects.toThrow(
      "Portal not found or disabled"
    );
  });

  it("inserts a client message and returns it", async () => {
    mockPortalLookup([mockPortal]);

    const inserted = {
      id: 99,
      senderType: "client",
      body: "Hello agency",
      readAt: null,
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
    };
    const returning = vi.fn().mockResolvedValue([inserted]);
    const values = vi.fn(() => ({ returning }));
    (db.insert as Mock).mockReturnValue({ values });

    const result = await sendPortalChatMessage("test-token", "Hello agency");

    expect(result).toEqual({
      id: 99,
      senderType: "client",
      body: "Hello agency",
      readAt: null,
      createdAt: "2026-05-01T11:00:00.000Z",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: 1,
        clientId: 10,
        userId: "user_1",
        senderType: "client",
        body: "Hello agency",
      })
    );
  });

  it("trims the message before persisting", async () => {
    mockPortalLookup([mockPortal]);

    const returning = vi.fn().mockResolvedValue([
      {
        id: 1,
        senderType: "client",
        body: "trimmed",
        readAt: null,
        createdAt: new Date("2026-05-01T11:00:00.000Z"),
      },
    ]);
    const values = vi.fn(() => ({ returning }));
    (db.insert as Mock).mockReturnValue({ values });

    await sendPortalChatMessage("test-token", "  trimmed  ");

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ body: "trimmed" })
    );
  });
});
