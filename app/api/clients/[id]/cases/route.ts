import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { cases, clients, tasks } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const clientId = Number(id);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const caseRows = await db
      .select({
        id: cases.id,
        name: cases.name,
        description: cases.description,
        status: cases.status,
        dueDate: cases.dueDate,
        priority: cases.priority,
        clientId: cases.clientId,
        userId: cases.userId,
        clientName: clients.name,
        totalTasks: sql<number>`COUNT(${tasks.id})::int`,
        completedTasks: sql<number>`COALESCE(SUM(CASE WHEN ${tasks.completed} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .leftJoin(tasks, eq(tasks.caseId, cases.id))
      .where(and(eq(cases.clientId, clientId), eq(cases.userId, user.id)))
      .groupBy(cases.id, clients.name);

    const casesWithStats = caseRows.map((c) => {
      const totalTasks = c.totalTasks;
      const completedTasks = c.completedTasks;
      const percentage =
        totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        dueDate: c.dueDate,
        priority: c.priority,
        clientId: c.clientId,
        userId: c.userId,
        clientName: c.clientName,
        stats: { totalTasks, completedTasks, percentage },
      };
    });

    return NextResponse.json({ cases: casesWithStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
