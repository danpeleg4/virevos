import { db, type DrizzleDB } from "../db";
import { demoRequests } from "../schema";
import { eq } from "drizzle-orm";

export type DemoRequestRow = typeof demoRequests.$inferSelect;
export type NewDemoRequestRow = typeof demoRequests.$inferInsert;

export interface DemoRequestsDB {
  insertDemoRequest(values: NewDemoRequestRow): Promise<DemoRequestRow>;
  setDemoRequestStatus(
    id: number,
    status: "notified" | "notify_failed",
    errorMessage: string | null
  ): Promise<void>;
}

export class DemoRequestsDrizzle implements DemoRequestsDB {
  constructor(private readonly db: DrizzleDB) {}

  async insertDemoRequest(values: NewDemoRequestRow): Promise<DemoRequestRow> {
    const [row] = await this.db.insert(demoRequests).values(values).returning();
    return row;
  }

  async setDemoRequestStatus(
    id: number,
    status: "notified" | "notify_failed",
    errorMessage: string | null
  ): Promise<void> {
    await this.db
      .update(demoRequests)
      .set({ status, errorMessage })
      .where(eq(demoRequests.id, id));
  }
}

export const demoRequestsDrizzle = new DemoRequestsDrizzle(db);
