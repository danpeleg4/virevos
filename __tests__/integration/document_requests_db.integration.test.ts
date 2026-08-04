import { eq } from "drizzle-orm";
import { DocumentRequestsDrizzle } from "@db/classes/document_requests_db";
import {
  caseFiles,
  cases,
  clients,
  documentRequestItems,
  events,
  meetingDocumentRequests,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("DocumentRequestsDrizzle (integration)", () => {
  const documentRequestsDb = new DocumentRequestsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
    await seedUser("user_2");
  });

  async function insertClientRow() {
    const [row] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Client A" })
      .returning();
    return row;
  }

  async function insertEventRow() {
    const [row] = await testDb
      .insert(events)
      .values({
        id: crypto.randomUUID(),
        userId: "user_1",
        title: "Meeting",
        dateTime: new Date("2026-01-01T10:00:00Z"),
        duration: 30,
      })
      .returning();
    return row;
  }

  async function insertRequestRow(
    overrides: Partial<typeof meetingDocumentRequests.$inferInsert> = {}
  ) {
    const event = await insertEventRow();
    const [row] = await testDb
      .insert(meetingDocumentRequests)
      .values({ eventId: event.id, userId: "user_1", ...overrides })
      .returning();
    return { request: row, event };
  }

  describe("getPendingRequests", () => {
    it("returns pending_approval requests joined with event info", async () => {
      const { request, event } = await insertRequestRow({
        status: "pending_approval",
      });
      await insertRequestRow({ status: "approved" });

      const rows = await documentRequestsDb.getPendingRequests("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(request.id);
      expect(rows[0].eventTitle).toBe(event.title);
    });
  });

  describe("getItemsByRequestIds", () => {
    it("returns items for the given request ids, ordered by sortOrder", async () => {
      const { request } = await insertRequestRow();
      await testDb.insert(documentRequestItems).values([
        { requestId: request.id, name: "Second", sortOrder: 1 },
        { requestId: request.id, name: "First", sortOrder: 0 },
      ]);

      const rows = await documentRequestsDb.getItemsByRequestIds([request.id]);

      expect(rows.map((r) => r.name)).toEqual(["First", "Second"]);
    });

    it("returns an empty array when given no request ids", async () => {
      const rows = await documentRequestsDb.getItemsByRequestIds([]);

      expect(rows).toEqual([]);
    });
  });

  describe("getItemsWithFilesByRequestIds", () => {
    it("returns items left-joined with their uploaded file info", async () => {
      const { request } = await insertRequestRow();
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
          name: "id.pdf",
          path: "/id.pdf",
          size: 10,
        })
        .returning();
      await testDb.insert(documentRequestItems).values({
        requestId: request.id,
        name: "ID",
        sortOrder: 0,
        uploadedFileId: file.id,
      });

      const rows = await documentRequestsDb.getItemsWithFilesByRequestIds([
        request.id,
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0].uploadedFileName).toBe("id.pdf");
    });
  });

  describe("getRequestOwner", () => {
    it("returns the request id scoped to the given user", async () => {
      const { request } = await insertRequestRow();

      const found = await documentRequestsDb.getRequestOwner(
        request.id,
        "user_1"
      );
      const notFound = await documentRequestsDb.getRequestOwner(
        request.id,
        "user_2"
      );

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getRequestClientId", () => {
    it("returns the clientId scoped to the given user", async () => {
      const client = await insertClientRow();
      const { request } = await insertRequestRow({ clientId: client.id });

      const [row] = await documentRequestsDb.getRequestClientId(
        request.id,
        "user_1"
      );

      expect(row.clientId).toBe(client.id);
    });
  });

  describe("setRequestClientId", () => {
    it("updates the request's clientId", async () => {
      const client = await insertClientRow();
      const { request } = await insertRequestRow();

      await documentRequestsDb.setRequestClientId(request.id, client.id);

      const [updated] = await testDb
        .select()
        .from(meetingDocumentRequests)
        .where(eq(meetingDocumentRequests.id, request.id));
      expect(updated.clientId).toBe(client.id);
    });
  });

  describe("getItemIdsForRequest", () => {
    it("returns the ids of items belonging to the request", async () => {
      const { request } = await insertRequestRow();
      const [item] = await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Item", sortOrder: 0 })
        .returning();

      const rows = await documentRequestsDb.getItemIdsForRequest(request.id);

      expect(rows).toEqual([{ id: item.id }]);
    });
  });

  describe("deleteItems", () => {
    it("deletes the given item ids", async () => {
      const { request } = await insertRequestRow();
      const [item] = await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Item", sortOrder: 0 })
        .returning();

      await documentRequestsDb.deleteItems([item.id]);

      const remaining = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.id, item.id));
      expect(remaining).toHaveLength(0);
    });

    it("does nothing when given an empty array", async () => {
      const { request } = await insertRequestRow();
      await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Item", sortOrder: 0 });

      await documentRequestsDb.deleteItems([]);

      const remaining = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.requestId, request.id));
      expect(remaining).toHaveLength(1);
    });
  });

  describe("updateItem", () => {
    it("updates the item's name, description and sortOrder", async () => {
      const { request } = await insertRequestRow();
      const [item] = await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Old", sortOrder: 0 })
        .returning();

      await documentRequestsDb.updateItem(item.id, {
        name: "New",
        description: "Updated",
        sortOrder: 2,
      });

      const [updated] = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.id, item.id));
      expect(updated.name).toBe("New");
      expect(updated.description).toBe("Updated");
      expect(updated.sortOrder).toBe(2);
    });
  });

  describe("insertItem", () => {
    it("creates a document request item", async () => {
      const { request } = await insertRequestRow();

      await documentRequestsDb.insertItem({
        requestId: request.id,
        name: "New Item",
        sortOrder: 0,
      });

      const rows = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.requestId, request.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("New Item");
    });
  });

  describe("applyRequestPatch", () => {
    it("updates the clientId and adds, updates and removes items atomically", async () => {
      const client = await insertClientRow();
      const { request } = await insertRequestRow();
      const [keepItem] = await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Keep Me", sortOrder: 0 })
        .returning();
      const [removeItem] = await testDb
        .insert(documentRequestItems)
        .values({ requestId: request.id, name: "Remove Me", sortOrder: 1 })
        .returning();

      await documentRequestsDb.applyRequestPatch(request.id, {
        clientId: client.id,
        items: [
          { id: keepItem.id, name: "Kept Renamed", sortOrder: 0 },
          { name: "Brand New", sortOrder: 1 },
        ],
      });

      const [updatedRequest] = await testDb
        .select()
        .from(meetingDocumentRequests)
        .where(eq(meetingDocumentRequests.id, request.id));
      const items = await testDb
        .select()
        .from(documentRequestItems)
        .where(eq(documentRequestItems.requestId, request.id));

      expect(updatedRequest.clientId).toBe(client.id);
      expect(items.map((i) => i.name).sort()).toEqual([
        "Brand New",
        "Kept Renamed",
      ]);
      expect(items.some((i) => i.id === removeItem.id)).toBe(false);
    });
  });

  describe("setRequestStatus", () => {
    it("updates the status and approvedAt when provided", async () => {
      const { request } = await insertRequestRow();
      const approvedAt = new Date("2026-01-02T00:00:00Z");

      await documentRequestsDb.setRequestStatus(
        request.id,
        "approved",
        approvedAt
      );

      const [updated] = await testDb
        .select()
        .from(meetingDocumentRequests)
        .where(eq(meetingDocumentRequests.id, request.id));
      expect(updated.status).toBe("approved");
      expect(updated.approvedAt?.toISOString()).toBe(approvedAt.toISOString());
    });

    it("updates only the status when approvedAt is not provided", async () => {
      const { request } = await insertRequestRow();

      await documentRequestsDb.setRequestStatus(request.id, "rejected");

      const [updated] = await testDb
        .select()
        .from(meetingDocumentRequests)
        .where(eq(meetingDocumentRequests.id, request.id));
      expect(updated.status).toBe("rejected");
      expect(updated.approvedAt).toBeNull();
    });
  });

  describe("getApprovedRequestsForClient", () => {
    it("returns approved requests for the client joined with event info", async () => {
      const client = await insertClientRow();
      const { request, event } = await insertRequestRow({
        clientId: client.id,
        status: "approved",
        approvedAt: new Date(),
      });
      await insertRequestRow({
        clientId: client.id,
        status: "pending_approval",
      });

      const rows = await documentRequestsDb.getApprovedRequestsForClient(
        client.id
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(request.id);
      expect(rows[0].eventTitle).toBe(event.title);
    });
  });
});
