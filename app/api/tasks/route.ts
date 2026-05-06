import { NextResponse } from "next/server";
import { db } from "@db/db";
import { cases, tasks } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const allTasks = await db
    .select({
      tasks: tasks,
      caseName: cases.name,
    })
    .from(tasks)
    .leftJoin(cases, eq(tasks.caseId, cases.id))
    .where(eq(tasks.userId, user.id));

  return NextResponse.json(allTasks);
}
