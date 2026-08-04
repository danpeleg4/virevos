import { eq } from "drizzle-orm";
import { PortalChatDrizzle } from "@db/classes/portal_chat_db";
import { clientPortalTokens, clients, portalMessages } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PortalChatDrizzle (integration)", () => {
  const portalChatDb = new PortalChatDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertPortalSetup() {
    const [client] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Client A" })
      .returning();
    const [portal] = await testDb
      .insert(clientPortalTokens)
      .values({ userId: "user_1", clientId: client.id, token: "tok-1" })
      .returning();
    return { client, portal };
  }

  async function insertMessageRow(
    portalId: number,
    clientId: number,
    overrides: Partial<typeof portalMessages.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(portalMessages)
      .values({
        portalId,
        clientId,
        userId: "user_1",
        senderType: "client",
        body: "Hello",
        ...overrides,
      })
      .returning();
    return row;
  }

  describe("getPortalForUser", () => {
    it("returns the portal token for the client and user", async () => {
      const { client, portal } = await insertPortalSetup();

      const rows = await portalChatDb.getPortalForUser(client.id, "user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(portal.id);
    });
  });

  describe("getPortalByToken", () => {
    it("returns the portal token row matching the token", async () => {
      const { portal } = await insertPortalSetup();

      const rows = await portalChatDb.getPortalByToken("tok-1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(portal.id);
    });
  });

  describe("insertMessage", () => {
    it("creates a message row and returns it", async () => {
      const { client, portal } = await insertPortalSetup();

      const created = await portalChatDb.insertMessage({
        portalId: portal.id,
        clientId: client.id,
        userId: "user_1",
        senderType: "client",
        body: "Hi there",
      });

      expect(created.id).toBeDefined();
      expect(created.body).toBe("Hi there");
      expect(created.readAt).toBeNull();
    });
  });

  describe("setChatStarred", () => {
    it("sets the chatStarred flag on the portal", async () => {
      const { portal } = await insertPortalSetup();

      await portalChatDb.setChatStarred(portal.id, true);

      const [updated] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.id, portal.id));
      expect(updated.chatStarred).toBe(true);
    });
  });

  describe("setChatArchived", () => {
    it("sets the chatArchived flag on the portal", async () => {
      const { portal } = await insertPortalSetup();

      await portalChatDb.setChatArchived(portal.id, true);

      const [updated] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.id, portal.id));
      expect(updated.chatArchived).toBe(true);
    });
  });

  describe("getLatestClientMessage", () => {
    it("returns the id of the most recent client message", async () => {
      const { client, portal } = await insertPortalSetup();
      await insertMessageRow(portal.id, client.id, {
        senderType: "client",
        body: "First",
      });
      const second = await insertMessageRow(portal.id, client.id, {
        senderType: "client",
        body: "Second",
      });
      await insertMessageRow(portal.id, client.id, { senderType: "agency" });

      const [latest] = await portalChatDb.getLatestClientMessage(portal.id);

      expect(latest.id).toBe(second.id);
    });
  });

  describe("markMessageUnread", () => {
    it("clears the readAt timestamp on the message", async () => {
      const { client, portal } = await insertPortalSetup();
      const message = await insertMessageRow(portal.id, client.id, {
        readAt: new Date(),
      });

      await portalChatDb.markMessageUnread(message.id);

      const [updated] = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.id, message.id));
      expect(updated.readAt).toBeNull();
    });
  });

  describe("deleteMessages", () => {
    it("deletes all messages for the portal", async () => {
      const { client, portal } = await insertPortalSetup();
      await insertMessageRow(portal.id, client.id);
      await insertMessageRow(portal.id, client.id);

      await portalChatDb.deleteMessages(portal.id);

      const remaining = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.portalId, portal.id));
      expect(remaining).toHaveLength(0);
    });
  });

  describe("resetChatFlags", () => {
    it("resets chatStarred and chatArchived to false", async () => {
      const { portal } = await insertPortalSetup();
      await testDb
        .update(clientPortalTokens)
        .set({ chatStarred: true, chatArchived: true })
        .where(eq(clientPortalTokens.id, portal.id));

      await portalChatDb.resetChatFlags(portal.id);

      const [updated] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.id, portal.id));
      expect(updated.chatStarred).toBe(false);
      expect(updated.chatArchived).toBe(false);
    });
  });

  describe("getMessagesForPortal", () => {
    it("returns messages for the portal in chronological order", async () => {
      const { client, portal } = await insertPortalSetup();
      const first = await insertMessageRow(portal.id, client.id, {
        body: "First",
      });
      const second = await insertMessageRow(portal.id, client.id, {
        body: "Second",
      });

      const rows = await portalChatDb.getMessagesForPortal(portal.id);

      expect(rows.map((r) => r.id)).toEqual([first.id, second.id]);
    });
  });

  describe("markClientMessagesRead", () => {
    it("marks unread client messages as read, leaving agency messages alone", async () => {
      const { client, portal } = await insertPortalSetup();
      const clientMsg = await insertMessageRow(portal.id, client.id, {
        senderType: "client",
      });
      const agencyMsg = await insertMessageRow(portal.id, client.id, {
        senderType: "agency",
      });

      await portalChatDb.markClientMessagesRead(portal.id);

      const [updatedClient] = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.id, clientMsg.id));
      const [updatedAgency] = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.id, agencyMsg.id));
      expect(updatedClient.readAt).not.toBeNull();
      expect(updatedAgency.readAt).toBeNull();
    });
  });

  describe("markAgencyMessagesRead", () => {
    it("marks unread agency messages as read, leaving client messages alone", async () => {
      const { client, portal } = await insertPortalSetup();
      const clientMsg = await insertMessageRow(portal.id, client.id, {
        senderType: "client",
      });
      const agencyMsg = await insertMessageRow(portal.id, client.id, {
        senderType: "agency",
      });

      await portalChatDb.markAgencyMessagesRead(portal.id);

      const [updatedClient] = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.id, clientMsg.id));
      const [updatedAgency] = await testDb
        .select()
        .from(portalMessages)
        .where(eq(portalMessages.id, agencyMsg.id));
      expect(updatedClient.readAt).toBeNull();
      expect(updatedAgency.readAt).not.toBeNull();
    });
  });
});
