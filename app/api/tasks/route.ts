import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addProjectTasksAction, getAllTasks } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/tasks_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const allTasks = await getAllTasks(tasksDrizzle);
    return NextResponse.json(allTasks);
  } catch (err) {
    console.error("[api/tasks GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const task = await addProjectTasksAction(body, tasksDrizzle);
    return NextResponse.json(task);
  } catch (err) {
    console.error("[api/tasks POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
