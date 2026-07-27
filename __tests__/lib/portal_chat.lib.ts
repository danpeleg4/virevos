import {
  deletePortalChat,
  getPortalChatMessages,
  getPortalChatThread,
  sendAgencyChatMessage,
  sendPortalChatMessage,
  updatePortalChat,
} from "@/lib/portal/portal_chat";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  canonicalChatMessage,
  canonicalPortalChatToken,
  canonicalPortalMessageRow,
  makeFakePortalChatDb,
} from "../fakes/fake_portal_chat_db";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const portalChatDb = makeFakePortalChatDb();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── sendPortalChatMessage ─────────────────────────────────────────────────

describe("sendPortalChatMessage", () => {
  it("throws when message is empty/whitespace", async () => {
    await expect(
      sendPortalChatMessage("test-token", "   ", portalChatDb)
    ).rejects.toThrow(/message is required/i);
  });

  it("throws when message exceeds the max length", async () => {
    await expect(
      sendPortalChatMessage("test-token", "x".repeat(5001), portalChatDb)
    ).rejects.toThrow(/exceeds max length/i);
  });

  it("throws Portal not found or disabled when token is unknown", async () => {
    portalChatDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      sendPortalChatMessage("missing", "hi", portalChatDb)
    ).rejects.toThrow("Portal not found or disabled");
  });

  it("throws Portal not found or disabled when portal is disabled", async () => {
    portalChatDb.getPortalByToken.mockResolvedValueOnce([
      { ...canonicalPortalChatToken, enabled: false },
    ]);
    await expect(
      sendPortalChatMessage("test-token", "hi", portalChatDb)
    ).rejects.toThrow("Portal not found or disabled");
  });

  it("inserts a client message and returns it", async () => {
    portalChatDb.insertMessage.mockResolvedValueOnce({
      id: 99,
      senderType: "client",
      body: "Hello agency",
      readAt: null,
      createdAt: new Date("2026-05-01T11:00:00.000Z"),
    });

    const result = await sendPortalChatMessage(
      "test-token",
      "Hello agency",
      portalChatDb
    );

    expect(result).toEqual({
      id: 99,
      senderType: "client",
      body: "Hello agency",
      readAt: null,
      createdAt: "2026-05-01T11:00:00.000Z",
    });
    expect(portalChatDb.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        portalId: canonicalPortalChatToken.id,
        clientId: canonicalPortalChatToken.clientId,
        userId: canonicalPortalChatToken.userId,
        senderType: "client",
        body: "Hello agency",
      })
    );
  });

  it("trims the message before persisting", async () => {
    await sendPortalChatMessage("test-token", "  trimmed  ", portalChatDb);

    expect(portalChatDb.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ body: "trimmed" })
    );
  });
});

// ─── sendAgencyChatMessage ──────────────────────────────────────────────────

describe("sendAgencyChatMessage", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(sendAgencyChatMessage(1, "hi", portalChatDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the portal is not found", async () => {
    portalChatDb.getPortalForUser.mockResolvedValueOnce([]);
    await expect(sendAgencyChatMessage(1, "hi", portalChatDb)).rejects.toThrow(
      "Portal not found"
    );
  });

  it("inserts an agency message and returns it", async () => {
    portalChatDb.insertMessage.mockResolvedValueOnce({
      ...canonicalChatMessage,
      senderType: "agency",
    });

    const result = await sendAgencyChatMessage(1, "Reply", portalChatDb);

    expect(portalChatDb.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderType: "agency", body: "Reply" })
    );
    expect(result.senderType).toBe("agency");
  });
});

// ─── updatePortalChat ───────────────────────────────────────────────────────

describe("updatePortalChat", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updatePortalChat(1, "star", portalChatDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the portal is not found", async () => {
    portalChatDb.getPortalForUser.mockResolvedValueOnce([]);
    await expect(updatePortalChat(1, "star", portalChatDb)).rejects.toThrow(
      "Portal not found"
    );
  });

  it("stars and unstars the chat", async () => {
    await updatePortalChat(1, "star", portalChatDb);
    expect(portalChatDb.setChatStarred).toHaveBeenCalledWith(
      canonicalPortalChatToken.id,
      true
    );

    await updatePortalChat(1, "unstar", portalChatDb);
    expect(portalChatDb.setChatStarred).toHaveBeenCalledWith(
      canonicalPortalChatToken.id,
      false
    );
  });

  it("archives and unarchives the chat", async () => {
    await updatePortalChat(1, "archive", portalChatDb);
    expect(portalChatDb.setChatArchived).toHaveBeenCalledWith(
      canonicalPortalChatToken.id,
      true
    );

    await updatePortalChat(1, "unarchive", portalChatDb);
    expect(portalChatDb.setChatArchived).toHaveBeenCalledWith(
      canonicalPortalChatToken.id,
      false
    );
  });

  it("marks the latest client message unread", async () => {
    await updatePortalChat(1, "markUnread", portalChatDb);
    expect(portalChatDb.markMessageUnread).toHaveBeenCalledWith(10);
  });

  it("does nothing when there is no client message to mark unread", async () => {
    portalChatDb.getLatestClientMessage.mockResolvedValueOnce([]);
    await updatePortalChat(1, "markUnread", portalChatDb);
    expect(portalChatDb.markMessageUnread).not.toHaveBeenCalled();
  });

  it("rejects an invalid action", async () => {
    await expect(updatePortalChat(1, "bogus", portalChatDb)).rejects.toThrow(
      "action must be one of"
    );
  });
});

// ─── deletePortalChat ───────────────────────────────────────────────────────

describe("deletePortalChat", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deletePortalChat(1, portalChatDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the portal is not found", async () => {
    portalChatDb.getPortalForUser.mockResolvedValueOnce([]);
    await expect(deletePortalChat(1, portalChatDb)).rejects.toThrow(
      "Portal not found"
    );
  });

  it("deletes messages and resets chat flags", async () => {
    await expect(deletePortalChat(1, portalChatDb)).resolves.toEqual({
      success: true,
    });
    expect(portalChatDb.deleteMessages).toHaveBeenCalledWith(
      canonicalPortalChatToken.id
    );
    expect(portalChatDb.resetChatFlags).toHaveBeenCalledWith(
      canonicalPortalChatToken.id
    );
  });
});

// ─── getPortalChatThread ──────────────────────────────────────────────────

describe("getPortalChatThread", () => {
  it("throws when no userId", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(() => getPortalChatThread(999, portalChatDb)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("throws when the portal is not found", async () => {
    portalChatDb.getPortalForUser.mockResolvedValueOnce([]);
    await expect(getPortalChatThread(1, portalChatDb)).rejects.toThrow(
      "Portal not found"
    );
  });

  it("returns portal chat thread on success", () => {
    const created = canonicalChatMessage.createdAt;
    expect(getPortalChatThread(1, portalChatDb)).resolves.toEqual({
      portalId: canonicalPortalChatToken.id,
      messages: [
        {
          ...canonicalChatMessage,
          createdAt: created?.toISOString(),
        },
      ],
    });
  });
});

// ─── getPortalChatMessages ──────────────────────────────────────────────────

describe("getPortalChatMessages", () => {
  it("throws 404 when the token is unknown or disabled", async () => {
    portalChatDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      getPortalChatMessages("bad-token", portalChatDb)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns messages and marks agency messages as read", async () => {
    const result = await getPortalChatMessages("test-token", portalChatDb);

    expect(result.messages).toEqual([
      expect.objectContaining({ id: canonicalPortalMessageRow.id }),
    ]);
    expect(portalChatDb.markAgencyMessagesRead).toHaveBeenCalledWith(
      canonicalPortalChatToken.id
    );
  });
});
