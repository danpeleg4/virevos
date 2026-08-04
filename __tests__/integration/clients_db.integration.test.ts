import { eq } from "drizzle-orm";
import { ClientsDrizzle } from "@db/classes/clients_db";
import {
  cases,
  clientPortalTokens,
  clients,
  outlookEmails,
  tasks,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("ClientsDrizzle (integration)", () => {
  const clientsDb = new ClientsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
    await seedUser("user_2");
  });

  async function insertClientRow(
    overrides: Partial<typeof clients.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Test Client", ...overrides })
      .returning();
    return row;
  }

  describe("insertClient", () => {
    it("creates a client row and returns it", async () => {
      const created = await clientsDb.insertClient({
        userId: "user_1",
        name: "Jane Client",
        email: "jane@client.com",
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Jane Client");
      expect(created.email).toBe("jane@client.com");
      expect(created.status).toBe("active");
    });
  });

  describe("getClientByName", () => {
    it("finds a client scoped to the given user, case-insensitively", async () => {
      const client = await insertClientRow({ name: "Jane Client" });

      const found = await clientsDb.getClientByName("user_1", "jane client");

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(client.id);
    });

    it("does not return a client belonging to a different user", async () => {
      await insertClientRow({ userId: "user_2", name: "Other User Client" });

      const found = await clientsDb.getClientByName(
        "user_1",
        "Other User Client"
      );

      expect(found).toHaveLength(0);
    });
  });

  describe("updateClient", () => {
    it("updates only the fields provided, scoped to the user", async () => {
      const client = await insertClientRow({
        name: "Old Name",
        email: "old@x.com",
      });

      await clientsDb.updateClient(client.id, "user_1", { name: "New Name" });

      const [updated] = await testDb
        .select()
        .from(clients)
        .where(eq(clients.id, client.id));
      expect(updated.name).toBe("New Name");
      expect(updated.email).toBe("old@x.com");
    });

    it("does not update a client belonging to a different user", async () => {
      const client = await insertClientRow({
        userId: "user_2",
        name: "Untouchable",
      });

      await clientsDb.updateClient(client.id, "user_1", { name: "Hacked" });

      const [unchanged] = await testDb
        .select()
        .from(clients)
        .where(eq(clients.id, client.id));
      expect(unchanged.name).toBe("Untouchable");
    });
  });

  describe("deleteClient", () => {
    it("deletes a client scoped to the given user", async () => {
      const client = await insertClientRow();

      await clientsDb.deleteClient(client.id, "user_1");

      const remaining = await testDb
        .select()
        .from(clients)
        .where(eq(clients.id, client.id));
      expect(remaining).toHaveLength(0);
    });

    it("does not delete a client belonging to a different user", async () => {
      const client = await insertClientRow({ userId: "user_2" });

      await clientsDb.deleteClient(client.id, "user_1");

      const remaining = await testDb
        .select()
        .from(clients)
        .where(eq(clients.id, client.id));
      expect(remaining).toHaveLength(1);
    });
  });

  describe("getClientsWithCaseCounts", () => {
    it("returns case counts per status for all of a user's clients", async () => {
      const client = await insertClientRow();
      await testDb.insert(cases).values([
        {
          userId: "user_1",
          clientId: client.id,
          name: "Case A",
          status: "completed",
        },
        {
          userId: "user_1",
          clientId: client.id,
          name: "Case B",
          status: "active",
        },
      ]);

      const rows = await clientsDb.getClientsWithCaseCounts("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].totalCases).toBe(2);
      expect(rows[0].completedCases).toBe(1);
      expect(rows[0].activeCases).toBe(1);
    });
  });

  describe("getClientWithCaseCounts", () => {
    it("returns case counts for a single client", async () => {
      const client = await insertClientRow();
      await testDb.insert(cases).values([
        {
          userId: "user_1",
          clientId: client.id,
          name: "Case A",
          status: "completed",
        },
        {
          userId: "user_1",
          clientId: client.id,
          name: "Case B",
          status: "active",
        },
        {
          userId: "user_1",
          clientId: client.id,
          name: "Case C",
          status: "active",
        },
      ]);

      const [result] = await clientsDb.getClientWithCaseCounts(
        client.id,
        "user_1"
      );

      expect(result.totalCases).toBe(3);
      expect(result.completedCases).toBe(1);
      expect(result.activeCases).toBe(2);
    });
  });

  describe("getPortalTokenByClient", () => {
    it("returns the portal token row for a client", async () => {
      const client = await insertClientRow();
      const [token] = await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "abc-123" })
        .returning();

      const found = await clientsDb.getPortalTokenByClient(client.id, "user_1");

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe(token.id);
      expect(found[0].token).toBe("abc-123");
    });
  });

  describe("getClientCasesWithStats", () => {
    it("returns task completion stats per case", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();
      await testDb.insert(tasks).values([
        {
          userId: "user_1",
          caseId: caseRow.id,
          title: "Task 1",
          completed: true,
        },
        {
          userId: "user_1",
          caseId: caseRow.id,
          title: "Task 2",
          completed: false,
        },
      ]);

      const rows = await clientsDb.getClientCasesWithStats(client.id, "user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].totalTasks).toBe(2);
      expect(rows[0].completedTasks).toBe(1);
    });
  });

  describe("getClientOutlookEmails", () => {
    it("returns emails for the client ordered by most recent", async () => {
      const client = await insertClientRow();
      await testDb.insert(outlookEmails).values([
        {
          userId: "user_1",
          clientId: client.id,
          outlookId: "o1",
          conversationId: "c1",
          subject: "Older",
          sentAt: new Date("2026-01-01"),
        },
        {
          userId: "user_1",
          clientId: client.id,
          outlookId: "o2",
          conversationId: "c2",
          subject: "Newer",
          sentAt: new Date("2026-02-01"),
        },
      ]);

      const rows = await clientsDb.getClientOutlookEmails(client.id, "user_1");

      expect(rows).toHaveLength(2);
      expect(rows[0].subject).toBe("Newer");
      expect(rows[1].subject).toBe("Older");
    });
  });

  describe("getPortalDetails", () => {
    it("returns the portal token joined with client name and email", async () => {
      const client = await insertClientRow({
        name: "Jane Client",
        email: "jane@client.com",
      });
      await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "abc-123" });

      const [details] = await clientsDb.getPortalDetails(client.id, "user_1");

      expect(details.clientName).toBe("Jane Client");
      expect(details.clientEmail).toBe("jane@client.com");
      expect(details.token).toBe("abc-123");
    });
  });

  describe("getPortalEnabledClients", () => {
    it("returns only active clients with an enabled portal token", async () => {
      const enabledClient = await insertClientRow({ name: "Enabled" });
      const disabledClient = await insertClientRow({ name: "Disabled" });
      await testDb.insert(clientPortalTokens).values([
        {
          userId: "user_1",
          clientId: enabledClient.id,
          token: "t1",
          enabled: true,
        },
        {
          userId: "user_1",
          clientId: disabledClient.id,
          token: "t2",
          enabled: false,
        },
      ]);

      const rows = await clientsDb.getPortalEnabledClients("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(enabledClient.id);
    });
  });

  describe("txAddClientAndPortal", () => {
    it("creates a client and its portal token together", async () => {
      const result = await clientsDb.txAddClientAndPortal({
        userId: "user_1",
        name: "Portal Client",
      });

      const [clientRow] = await testDb
        .select()
        .from(clients)
        .where(eq(clients.id, result.id));
      const [portalRow] = await testDb
        .select()
        .from(clientPortalTokens)
        .where(eq(clientPortalTokens.clientId, result.id));

      expect(clientRow.name).toBe("Portal Client");
      expect(portalRow.token).toBe(result.token);
      expect(portalRow.enabled).toBe(true);
    });
  });
});
