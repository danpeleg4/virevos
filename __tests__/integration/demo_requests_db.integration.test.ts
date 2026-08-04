import { eq } from "drizzle-orm";
import { DemoRequestsDrizzle } from "@db/classes/demo_requests_db";
import { demoRequests } from "@db/schema";
import { resetDb, testDb } from "./helpers/db";

describe("DemoRequestsDrizzle (integration)", () => {
  const demoRequestsDb = new DemoRequestsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
  });

  describe("insertDemoRequest", () => {
    it("creates a demo request row with default pending status", async () => {
      const created = await demoRequestsDb.insertDemoRequest({
        name: "Jane Doe",
        email: "jane@example.com",
        company: "Acme",
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe("pending");
      expect(created.company).toBe("Acme");
    });
  });

  describe("setDemoRequestStatus", () => {
    it("updates the status and error message of a demo request", async () => {
      const [row] = await testDb
        .insert(demoRequests)
        .values({ name: "Jane Doe", email: "jane@example.com" })
        .returning();

      await demoRequestsDb.setDemoRequestStatus(
        row.id,
        "notify_failed",
        "SMTP timeout"
      );

      const [updated] = await testDb
        .select()
        .from(demoRequests)
        .where(eq(demoRequests.id, row.id));
      expect(updated.status).toBe("notify_failed");
      expect(updated.errorMessage).toBe("SMTP timeout");
    });
  });
});
