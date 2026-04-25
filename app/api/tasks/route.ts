import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { cases, tasks } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Task } from "@/types/tasks";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch all tasks with case name
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

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, description, priority, dueDate, caseName } = body as Pick<
      Task,
      "title" | "description" | "dueDate" | "priority" | "caseName"
    >;

    if (!title || !title.trim()) {
      return new NextResponse("Missing title", { status: 400 });
    }

    // Validate case if provided
    let caseId: number | null = null;

    if (
      caseName !== undefined &&
      caseName !== null &&
      String(caseName).trim() !== ""
    ) {
      const maybeId = Number(caseName);
      if (!Number.isNaN(maybeId)) {
        const byId = await db
          .select()
          .from(cases)
          .where(eq(cases.id, maybeId));

        if (!byId.length) {
          return new NextResponse("Case not found", { status: 400 });
        }
        if (byId[0].userId !== user.id) {
          return new NextResponse("Unauthorized case", { status: 403 });
        }
        caseId = maybeId;
      } else {
        // Treat as case name; find for this user
        const byName = await db
          .select()
          .from(cases)
          .where(eq(cases.name, String(caseName)));

        if (!byName.length) {
          return new NextResponse("Case not found", { status: 400 });
        }
        if (byName[0].userId !== user.id) {
          return new NextResponse("Unauthorized case", { status: 403 });
        }
        caseId = byName[0].id;
      }
    }

    // Build values, omitting dueDate if empty so DB default applies
    const values: Pick<
      Task,
      | "title"
      | "description"
      | "priority"
      | "dueDate"
      | "caseId"
      | "userId"
      | "status"
      | "completed"
    > = {
      dueDate: new Date().toISOString(),
      title: title.trim(),
      description,
      priority,
      caseId,
      userId: user.id,
      status: "in-progress",
      completed: false,
    };
    if (dueDate && String(dueDate).trim() !== "") {
      values.dueDate = dueDate;
    }

    const newTask = await db.insert(tasks).values(values).returning();
    return NextResponse.json(
      { success: true, task: newTask[0] },
      { status: 201 }
    );
  } catch (err: unknown) {
    return new NextResponse(
      err instanceof Error ? err.message : "An error occurred",
      { status: 500 }
    );
  }
}
