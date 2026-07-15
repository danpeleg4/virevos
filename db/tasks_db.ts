import { db, type DrizzleDB } from "./db";
import { cases, tasks } from "./schema";
import { and, eq } from "drizzle-orm";

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

export type TaskUpdateData = Partial<
  Pick<
    NewTaskRow,
    "title" | "description" | "priority" | "status" | "completed" | "dueDate"
  >
>;

export type CaseOwnerRow = {
  id: number;
  userId: string;
};

export interface TasksDB {
  getAllTasksWithCaseName(
    userId: string
  ): Promise<{ tasks: TaskRow; caseName: string | null }[]>;
  getTasksByCase(userId: string, caseId: number): Promise<TaskRow[]>;
  findTaskById(taskId: number): Promise<TaskRow | undefined>;
  updateTask(
    taskId: number,
    userId: string,
    data: TaskUpdateData
  ): Promise<void>;
  deleteTask(taskId: number, userId: string): Promise<void>;
  insertTask(values: NewTaskRow): Promise<TaskRow>;
  getCaseById(caseId: number): Promise<CaseOwnerRow[]>;
  getCaseByName(name: string): Promise<CaseOwnerRow[]>;
}

export class TasksDrizzle implements TasksDB {
  constructor(private readonly db: DrizzleDB) {}

  async getAllTasksWithCaseName(
    userId: string
  ): Promise<{ tasks: TaskRow; caseName: string | null }[]> {
    return this.db
      .select({
        tasks: tasks,
        caseName: cases.name,
      })
      .from(tasks)
      .leftJoin(cases, eq(tasks.caseId, cases.id))
      .where(eq(tasks.userId, userId));
  }

  async getTasksByCase(userId: string, caseId: number): Promise<TaskRow[]> {
    return this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.caseId, caseId)));
  }

  async findTaskById(taskId: number): Promise<TaskRow | undefined> {
    return this.db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });
  }

  async updateTask(
    taskId: number,
    userId: string,
    data: TaskUpdateData
  ): Promise<void> {
    await this.db
      .update(tasks)
      .set(data)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async deleteTask(taskId: number, userId: string): Promise<void> {
    await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  }

  async insertTask(values: NewTaskRow): Promise<TaskRow> {
    const inserted = await this.db.insert(tasks).values(values).returning();
    return inserted[0];
  }

  async getCaseById(caseId: number): Promise<CaseOwnerRow[]> {
    return this.db
      .select({ id: cases.id, userId: cases.userId })
      .from(cases)
      .where(eq(cases.id, caseId));
  }

  async getCaseByName(name: string): Promise<CaseOwnerRow[]> {
    return this.db
      .select({ id: cases.id, userId: cases.userId })
      .from(cases)
      .where(eq(cases.name, name));
  }
}

export const tasksDrizzle = new TasksDrizzle(db);
