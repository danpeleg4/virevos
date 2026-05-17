import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { tasks } from "@db/schema";
import { and, eq } from "drizzle-orm";
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

  const data = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.caseId, caseId)));

  return NextResponse.json(data);
}
