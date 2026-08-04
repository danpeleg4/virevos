import { eq } from "drizzle-orm";
import { TasksDrizzle } from "@db/classes/tasks_db";
import { cases, tasks } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("TasksDrizzle (integration)", () => {
  const tasksDb = new TasksDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
    await seedUser("user_2");
  });

  async function insertCaseRow(
    overrides: Partial<typeof cases.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(cases)
      .values({ userId: "user_1", name: "Test Case", ...overrides })
      .returning();
    return row;
  }

  async function insertTaskRow(
    overrides: Partial<typeof tasks.$inferInsert> = {}
  ) {
    const [row] = await testDb
      .insert(tasks)
      .values({ userId: "user_1", title: "Test Task", ...overrides })
      .returning();
    return row;
  }

  describe("getAllTasksWithCaseName", () => {
    it("returns the user's tasks left-joined with their case name", async () => {
      const caseRow = await insertCaseRow({ name: "Case A" });
      await insertTaskRow({ caseId: caseRow.id, title: "Task 1" });

      const rows = await tasksDb.getAllTasksWithCaseName("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].caseName).toBe("Case A");
      expect(rows[0].tasks.title).toBe("Task 1");
    });
  });

  describe("getTasksByCase", () => {
    it("returns tasks scoped to the user and case", async () => {
      const caseRow = await insertCaseRow();
      await insertTaskRow({ caseId: caseRow.id, title: "In Case" });
      await insertTaskRow({ title: "No Case" });

      const rows = await tasksDb.getTasksByCase("user_1", caseRow.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe("In Case");
    });
  });

  describe("findTaskById", () => {
    it("finds a task scoped to the user", async () => {
      const task = await insertTaskRow();

      const found = await tasksDb.findTaskById(task.id, "user_1");
      const notFound = await tasksDb.findTaskById(task.id, "user_2");

      expect(found?.id).toBe(task.id);
      expect(notFound).toBeUndefined();
    });
  });

  describe("updateTask", () => {
    it("updates only the given fields, scoped to the user", async () => {
      const task = await insertTaskRow({ title: "Old Title" });

      await tasksDb.updateTask(task.id, "user_1", { title: "New Title" });

      const [updated] = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(updated.title).toBe("New Title");
    });

    it("does not update a task belonging to a different user", async () => {
      const task = await insertTaskRow({
        userId: "user_2",
        title: "Untouchable",
      });

      await tasksDb.updateTask(task.id, "user_1", { title: "Hacked" });

      const [unchanged] = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(unchanged.title).toBe("Untouchable");
    });
  });

  describe("deleteTask", () => {
    it("deletes a task scoped to the user", async () => {
      const task = await insertTaskRow();

      await tasksDb.deleteTask(task.id, "user_1");

      const remaining = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(remaining).toHaveLength(0);
    });

    it("does not delete a task belonging to a different user", async () => {
      const task = await insertTaskRow({ userId: "user_2" });

      await tasksDb.deleteTask(task.id, "user_1");

      const remaining = await testDb
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      expect(remaining).toHaveLength(1);
    });
  });

  describe("insertTask", () => {
    it("creates a task row and returns it", async () => {
      const created = await tasksDb.insertTask({
        userId: "user_1",
        title: "Brand New Task",
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe("Brand New Task");
      expect(created.status).toBe("in-progress");
    });
  });

  describe("getCaseById", () => {
    it("returns the case id and owning userId", async () => {
      const caseRow = await insertCaseRow();

      const rows = await tasksDb.getCaseById(caseRow.id);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ id: caseRow.id, userId: "user_1" });
    });
  });

  describe("getCaseByName", () => {
    it("returns the case id and owning userId by exact name", async () => {
      const caseRow = await insertCaseRow({ name: "Unique Case Name" });

      const rows = await tasksDb.getCaseByName("Unique Case Name");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(caseRow.id);
    });
  });

  describe("getTaskByTitle", () => {
    it("finds a task by title, case-insensitively", async () => {
      await insertTaskRow({ title: "Follow Up" });

      const rows = await tasksDb.getTaskByTitle("user_1", "follow up");

      expect(rows).toHaveLength(1);
    });
  });
});
