import { eq } from "drizzle-orm";
import { PortalDrizzle } from "@db/classes/portal_db";
import { clientPortalTokens, clients } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PortalDrizzle (integration)", () => {
  const portalDb = new PortalDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertClientRow() {
    const [row] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Test Client" })
      .returning();
    return row;
  }

  describe("getClientOwnedByUser", () => {
    it("returns the client id and name when owned by the user", async () => {
      const client = await insertClientRow();

      const found = await portalDb.getClientOwnedByUser(client.id, "user_1");
      const notFound = await portalDb.getClientOwnedByUser(client.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getPortalTokenByClient", () => {
    it("returns the portal token for the client", async () => {
      const client = await insertClientRow();
      await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "tok-1" });

      const rows = await portalDb.getPortalTokenByClient(client.id, "user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].token).toBe("tok-1");
    });
  });

  describe("updatePortalToken", () => {
    it("updates the token's settings and enabled flag", async () => {
      const client = await insertClientRow();
      const [token] = await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "tok-1" })
        .returning();

      const updated = await portalDb.updatePortalToken(token.id, {
        enabled: false,
        settings: { title: "Custom Portal" },
      });

      expect(updated.enabled).toBe(false);
      expect(updated.settings?.title).toBe("Custom Portal");
    });
  });

  describe("insertPortalToken", () => {
    it("creates a portal token row", async () => {
      const client = await insertClientRow();

      const created = await portalDb.insertPortalToken({
        clientId: client.id,
        token: "tok-new",
        enabled: true,
        settings: {},
        userId: "user_1",
      });

      expect(created.id).toBeDefined();
      const [row] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.id, created.id));
      expect(row.token).toBe("tok-new");
    });
  });
});
