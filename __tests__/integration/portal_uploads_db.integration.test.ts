import { eq } from "drizzle-orm";
import { PortalUploadsDrizzle } from "@db/classes/portal_uploads_db";
import {
  caseFiles,
  cases,
  clientPortalTokens,
  clients,
  documentRequestItems,
  events,
  meetingDocumentRequests,
  users,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PortalUploadsDrizzle (integration)", () => {
  const portalUploadsDb = new PortalUploadsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertClientRow() {
    const [row] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Client A" })
      .returning();
    return row;
  }

  async function insertDocumentRequestSetup() {
    const client = await insertClientRow();
    const [caseRow] = await testDb
      .insert(cases)
      .values({ userId: "user_1", clientId: client.id, name: "Case A" })
      .returning();
    const [event] = await testDb
      .insert(events)
      .values({
        id: crypto.randomUUID(),
        userId: "user_1",
        title: "Meeting",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 30,
      })
      .returning();
    const [request] = await testDb
      .insert(meetingDocumentRequests)
      .values({ eventId: event.id, clientId: client.id, userId: "user_1" })
      .returning();
    const [item] = await testDb
      .insert(documentRequestItems)
      .values({ requestId: request.id, name: "ID Card" })
      .returning();
    return { client, caseRow, event, request, item };
  }

  describe("getPortalTokenByToken", () => {
    it("returns the portal token row matching the token", async () => {
      const client = await insertClientRow();
      const [portal] = await testDb
        .insert(clientPortalTokens)
        .values({ userId: "user_1", clientId: client.id, token: "tok-1" })
        .returning();

      const rows = await portalUploadsDb.getPortalTokenByToken("tok-1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(portal.id);
    });
  });

  describe("getDocumentRequestItemWithRequest", () => {
    it("returns the item joined with its parent request", async () => {
      const { item, request, client } = await insertDocumentRequestSetup();

      const [row] = await portalUploadsDb.getDocumentRequestItemWithRequest(
        item.id
      );

      expect(row.itemName).toBe("ID Card");
      expect(row.requestId).toBe(request.id);
      expect(row.requestClientId).toBe(client.id);
    });
  });

  describe("getFirstCaseForClient", () => {
    it("returns a case id belonging to the client", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();

      const rows = await portalUploadsDb.getFirstCaseForClient(client.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(caseRow.id);
    });
  });

  describe("getCaseForClient", () => {
    it("returns the case scoped to the given client", async () => {
      const client = await insertClientRow();
      const [caseRow] = await testDb
        .insert(cases)
        .values({ userId: "user_1", clientId: client.id, name: "Case A" })
        .returning();

      const found = await portalUploadsDb.getCaseForClient(
        caseRow.id,
        client.id
      );
      const notFound = await portalUploadsDb.getCaseForClient(
        caseRow.id,
        client.id + 999
      );

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getClientById", () => {
    it("returns the client matching the id", async () => {
      const client = await insertClientRow();

      const rows = await portalUploadsDb.getClientById(client.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(client.id);
    });
  });

  describe("insertCaseFile", () => {
    it("creates a case file row and returns it", async () => {
      const { caseRow } = await insertDocumentRequestSetup();

      const created = await portalUploadsDb.insertCaseFile({
        caseId: caseRow.id,
        userId: "user_1",
        name: "id.pdf",
        path: "/id.pdf",
        size: 12,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("id.pdf");
    });
  });

  describe("updateDocumentRequestItem", () => {
    it("updates the item's status and upload metadata", async () => {
      const { item, caseRow } = await insertDocumentRequestSetup();
      const [file] = await testDb
        .insert(caseFiles)
        .values({
          caseId: caseRow.id,
          userId: "user_1",
          name: "id.pdf",
          path: "/id.pdf",
          size: 12,
        })
        .returning();
      const uploadedAt = new Date("2026-02-01T00:00:00Z");

      await portalUploadsDb.updateDocumentRequestItem(item.id, {
        status: "uploaded",
        uploadedFileId: file.id,
        uploadedAt,
      });

      const [updated] = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.id, item.id));
      expect(updated.status).toBe("uploaded");
      expect(updated.uploadedFileId).toBe(file.id);
      expect(updated.uploadedAt?.toISOString()).toBe(uploadedAt.toISOString());
    });
  });

  describe("incrementAiCredits", () => {
    it("increments the user's ai credits by one", async () => {
      await testDb
        .update(users)
        .set({ aiCredits: 3 })
        .where(eq(users.userId, "user_1"));

      await portalUploadsDb.incrementAiCredits("user_1");

      const [updated] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(updated.aiCredits).toBe(4);
    });
  });

  describe("insertCaseFileWithStorage", () => {
    it("inserts the file and increments user storage atomically", async () => {
      await testDb
        .update(users)
        .set({ storage: 5 })
        .where(eq(users.userId, "user_1"));
      const { caseRow } = await insertDocumentRequestSetup();

      const created = await portalUploadsDb.insertCaseFileWithStorage({
        caseId: caseRow.id,
        userId: "user_1",
        name: "id.pdf",
        path: "/id.pdf",
        size: 15,
      });

      expect(created.id).toBeDefined();
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(user.storage).toBe(20);
    });
  });
});
