import { getCurrentUser } from "@/lib/supabase/auth";
import { getTasksByCase } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/classes/tasks_db";
import { ValidationError } from "@/lib/util/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const caseId = Number(id);
  if (Number.isNaN(caseId)) {
    return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
  }

  try {
    const data = await getTasksByCase(caseId, tasksDrizzle);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/cases/[id]/tasks GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
