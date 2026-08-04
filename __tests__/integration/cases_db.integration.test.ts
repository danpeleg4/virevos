import { eq } from "drizzle-orm";
import { CasesDrizzle } from "@db/classes/cases_db";
import { caseFiles, caseNotes, cases, clients, tasks, users } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("CasesDrizzle (integration)", () => {
  const casesDb = new CasesDrizzle(testDb);

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

  async function insertCaseRow(
    overrides: Partial<typeof cases.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(cases)
      .values({ userId: "user_1", name: "Test Case", ...overrides })
      .returning();
    return row;
  }

  describe("getCaseById", () => {
    it("returns a case scoped to the given user", async () => {
      const caseRow = await insertCaseRow();

      const found = await casesDb.getCaseById(caseRow.id, "user_1");
      const notFound = await casesDb.getCaseById(caseRow.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getCaseByName", () => {
    it("finds a case by name, case-insensitively", async () => {
      await insertCaseRow({ name: "Contract Review" });

      const found = await casesDb.getCaseByName("user_1", "contract review");

      expect(found).toHaveLength(1);
    });
  });

  describe("getClientByName", () => {
    it("finds a client by name, case-insensitively", async () => {
      await insertClientRow({ name: "Jane Client" });

      const found = await casesDb.getClientByName("user_1", "jane client");

      expect(found).toHaveLength(1);
    });
  });

  describe("getCasesWithStats", () => {
    it("returns cases with client name and task completion counts", async () => {
      const client = await insertClientRow({ name: "Client A" });
      const caseRow = await insertCaseRow({ clientId: client.id });
      await testDb.insert(tasks).values([
        { userId: "user_1", caseId: caseRow.id, title: "T1", completed: true },
        { userId: "user_1", caseId: caseRow.id, title: "T2", completed: false },
      ]);

      const rows = await casesDb.getCasesWithStats("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].clientName).toBe("Client A");
      expect(rows[0].totalTasks).toBe(2);
      expect(rows[0].completedTasks).toBe(1);
    });
  });

  describe("getClientsForUser", () => {
    it("returns the user's clients ordered by id", async () => {
      await insertClientRow({ name: "B" });
      await insertClientRow({ name: "A" });

      const rows = await casesDb.getClientsForUser("user_1");

      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("B");
    });
  });

  describe("getCaseSummary", () => {
    it("returns the case joined with its client name", async () => {
      const client = await insertClientRow({ name: "Client A" });
      const caseRow = await insertCaseRow({ clientId: client.id });

      const [summary] = await casesDb.getCaseSummary(caseRow.id, "user_1");

      expect(summary.clientName).toBe("Client A");
    });
  });

  describe("getCaseNotes", () => {
    it("returns notes for the case, newest first", async () => {
      const caseRow = await insertCaseRow();
      const [note1] = await testDb
        .insert(caseNotes)
        .values({ userId: "user_1", caseId: caseRow.id, content: "First" })
        .returning();
      const [note2] = await testDb
        .insert(caseNotes)
        .values({ userId: "user_1", caseId: caseRow.id, content: "Second" })
        .returning();

      const rows = await casesDb.getCaseNotes("user_1", caseRow.id);

      expect(rows.map((r) => r.id)).toEqual([note2.id, note1.id]);
    });
  });

  describe("getUserFiles", () => {
    it("returns the user's files joined with case name", async () => {
      const caseRow = await insertCaseRow({ name: "Case A" });
      await testDb.insert(caseFiles).values({
        caseId: caseRow.id,
        userId: "user_1",
        name: "doc.pdf",
        path: "/doc.pdf",
        size: 10,
      });

      const rows = await casesDb.getUserFiles("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].caseName).toBe("Case A");
    });
  });

  describe("getCaseFileById", () => {
    it("returns a file scoped to the user", async () => {
      const caseRow = await insertCaseRow();
      const [file] = await testDb
        .insert(caseFiles)
        .values({
          caseId: caseRow.id,
          userId: "user_1",
          name: "doc.pdf",
          path: "/doc.pdf",
          size: 10,
        })
        .returning();

      const found = await casesDb.getCaseFileById(file.id, "user_1");
      const notFound = await casesDb.getCaseFileById(file.id, "user_2");

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("getCaseFilesByCase", () => {
    it("returns files scoped to the case and user", async () => {
      const caseRow = await insertCaseRow();
      await testDb.insert(caseFiles).values({
        caseId: caseRow.id,
        userId: "user_1",
        name: "doc.pdf",
        path: "/doc.pdf",
        size: 10,
      });

      const rows = await casesDb.getCaseFilesByCase(caseRow.id, "user_1");

      expect(rows).toHaveLength(1);
    });
  });

  describe("getCaseFilePaths", () => {
    it("returns the path and size of files for the case", async () => {
      const caseRow = await insertCaseRow();
      await testDb.insert(caseFiles).values({
        caseId: caseRow.id,
        userId: "user_1",
        name: "doc.pdf",
        path: "/doc.pdf",
        size: 42,
      });

      const rows = await casesDb.getCaseFilePaths(caseRow.id, "user_1");

      expect(rows).toEqual([{ path: "/doc.pdf", size: 42 }]);
    });
  });

  describe("deleteCaseCascade", () => {
    it("deletes the case, its files, tasks and notes, and reduces user storage", async () => {
      await testDb
        .update(users)
        .set({ storage: 100 })
        .where(eq(users.userId, "user_1"));
      const caseRow = await insertCaseRow();
      await testDb.insert(caseFiles).values({
        caseId: caseRow.id,
        userId: "user_1",
        name: "doc.pdf",
        path: "/doc.pdf",
        size: 40,
      });
      await testDb
        .insert(tasks)
        .values({ userId: "user_1", caseId: caseRow.id, title: "T1" });
      await testDb
        .insert(caseNotes)
        .values({ userId: "user_1", caseId: caseRow.id, content: "Note" });

      await casesDb.deleteCaseCascade(caseRow.id, "user_1", 40);

      const [remainingCase] = await testDb
        .select()
        .from(cases)
        .where(eq(cases.id, caseRow.id));
      const remainingFiles = await testDb
        .select()
        .from(caseFiles)
        .where(eq(caseFiles.caseId, caseRow.id));
      const remainingTasks = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.caseId, caseRow.id));
      const remainingNotes = await testDb
        .select()
        .from(caseNotes)
        .where(eq(caseNotes.caseId, caseRow.id));
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));

      expect(remainingCase).toBeUndefined();
      expect(remainingFiles).toHaveLength(0);
      expect(remainingTasks).toHaveLength(0);
      expect(remainingNotes).toHaveLength(0);
      expect(user.storage).toBe(60);
    });
  });

  describe("insertCaseFileWithStorage", () => {
    it("inserts the file and increments user storage atomically", async () => {
      await testDb
        .update(users)
        .set({ storage: 10 })
        .where(eq(users.userId, "user_1"));
      const caseRow = await insertCaseRow();

      await casesDb.insertCaseFileWithStorage({
        caseId: caseRow.id,
        userId: "user_1",
        name: "doc.pdf",
        path: "/doc.pdf",
        size: 25,
      });

      const files = await testDb
        .select()
        .from(caseFiles)
        .where(eq(caseFiles.caseId, caseRow.id));
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));

      expect(files).toHaveLength(1);
      expect(user.storage).toBe(35);
    });
  });

  describe("deleteCaseFileWithStorage", () => {
    it("deletes the file and decrements user storage atomically", async () => {
      await testDb
        .update(users)
        .set({ storage: 50 })
        .where(eq(users.userId, "user_1"));
      const caseRow = await insertCaseRow();
      const [file] = await testDb
        .insert(caseFiles)
        .values({
          caseId: caseRow.id,
          userId: "user_1",
          name: "doc.pdf",
          path: "/doc.pdf",
          size: 20,
        })
        .returning();

      await casesDb.deleteCaseFileWithStorage(file.id, "user_1", 20);

      const remaining = await testDb
        .select()
        .from(caseFiles)
        .where(eq(caseFiles.id, file.id));
      const [user] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));

      expect(remaining).toHaveLength(0);
      expect(user.storage).toBe(30);
    });
  });

  describe("insertCase", () => {
    it("creates a case row and returns it", async () => {
      const created = await casesDb.insertCase({
        userId: "user_1",
        name: "Brand New Case",
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Brand New Case");
      expect(created.status).toBe("active");
    });
  });

  describe("insertCaseNote", () => {
    it("creates a case note", async () => {
      const caseRow = await insertCaseRow();

      await casesDb.insertCaseNote("Some note", "user_1", caseRow.id);

      const notes = await testDb
        .select()
        .from(caseNotes)
        .where(eq(caseNotes.caseId, caseRow.id));
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe("Some note");
    });
  });

  describe("updateCase", () => {
    it("updates only the given fields, scoped to the user", async () => {
      const caseRow = await insertCaseRow({ name: "Old Name" });

      await casesDb.updateCase(caseRow.id, "user_1", { name: "New Name" });

      const [updated] = await testDb
        .select()
        .from(cases)
        .where(eq(cases.id, caseRow.id));
      expect(updated.name).toBe("New Name");
    });

    it("does not update a case belonging to a different user", async () => {
      const caseRow = await insertCaseRow({
        userId: "user_2",
        name: "Untouchable",
      });

      await casesDb.updateCase(caseRow.id, "user_1", { name: "Hacked" });

      const [unchanged] = await testDb
        .select()
        .from(cases)
        .where(eq(cases.id, caseRow.id));
      expect(unchanged.name).toBe("Untouchable");
    });
  });
});
