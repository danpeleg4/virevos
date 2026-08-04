import { eq } from "drizzle-orm";
import { PortalMainDrizzle } from "@db/classes/portal_main_db";
import { caseFiles, cases, clientPortalTokens, clients } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PortalMainDrizzle (integration)", () => {
  const portalMainDb = new PortalMainDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertClientRow() {
    const [client] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Client" })
      .returning();
    return client;
  }

  describe("getPortalByToken", () => {
    it("returns the portal token row matching the token", async () => {
      const client = await insertClientRow();
      await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "tok-1" });

      const rows = await portalMainDb.getPortalByToken("tok-1");

      expect(rows).toHaveLength(1);
      expect(rows[0].clientId).toBe(client.id);
    });
  });

  describe("touchLastAccessed", () => {
    it("sets lastAccessedAt on the portal row", async () => {
      const client = await insertClientRow();
      const [portal] = await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "tok-1" })
        .returning();
      expect(portal.lastAccessedAt).toBeNull();

      await portalMainDb.touchLastAccessed(portal.id);

      const [updated] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.id, portal.id));
      expect(updated.lastAccessedAt).not.toBeNull();
    });
  });

  describe("getClientById", () => {
    it("returns the client matching the id", async () => {
      const client = await insertClientRow();

      const rows = await portalMainDb.getClientById(client.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(client.id);
    });
  });

  describe("getCasesForClient", () => {
    it("returns all cases for the given client", async () => {
      const client = await insertClientRow();
      await testDb.insert(cases).values([
        { userId: "user_1", clientId: client.id, name: "Case A" },
        { userId: "user_1", clientId: client.id, name: "Case B" },
      ]);

      const rows = await portalMainDb.getCasesForClient(client.id);

      expect(rows).toHaveLength(2);
    });
  });

  describe("getCaseFilesForCases", () => {
    it("returns files belonging to the given cases", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();
      await testDb.insert(caseFiles).values({
        caseId: caseRow.id,
        userId: "user_1",
        name: "file.pdf",
        path: "/f.pdf",
        size: 100,
      });

      const rows = await portalMainDb.getCaseFilesForCases([caseRow.id]);

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("file.pdf");
    });

    it("returns an empty array when given no case ids", async () => {
      const rows = await portalMainDb.getCaseFilesForCases([]);

      expect(rows).toEqual([]);
    });
  });

  describe("getCaseFileById", () => {
    it("returns the file matching the id", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();
      const [file] = await testDb
        .insert(caseFiles)
        .values({
          caseId: caseRow.id,
          userId: "user_1",
          name: "file.pdf",
          path: "/f.pdf",
          size: 100,
        })
        .returning();

      const rows = await portalMainDb.getCaseFileById(file.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(file.id);
    });
  });

  describe("getCaseById", () => {
    it("returns the case matching the id", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();

      const rows = await portalMainDb.getCaseById(caseRow.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(caseRow.id);
    });
  });
});
