import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteTask, updateTask } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/classes/tasks_db";
import { ValidationError } from "@/lib/util/validation";

function parseTaskId(id: string): number | null {
  const taskId = Number(id);
  return Number.isInteger(taskId) ? taskId : null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const taskId = parseTaskId(id);
    if (taskId === null) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    const body = await req.json();
    await updateTask({ ...body, id: taskId }, tasksDrizzle);
    return NextResponse.json({ success: true, id: taskId });
  } catch (err) {
    console.error("[api/tasks/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const taskId = parseTaskId(id);
    if (taskId === null) {
      return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
    }

    await deleteTask(taskId, tasksDrizzle);
    return NextResponse.json({ success: true, id: taskId });
  } catch (err) {
    console.error("[api/tasks/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
