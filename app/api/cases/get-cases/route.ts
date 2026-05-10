import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { cases, clients, tasks } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [caseRows, allClients] = await Promise.all([
    db
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
      .where(eq(cases.userId, user.id))
      .groupBy(cases.id, clients.name),
    db
      .select()
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(clients.id),
  ]);

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

  return NextResponse.json({ cases: casesWithStats, allClients });
}
