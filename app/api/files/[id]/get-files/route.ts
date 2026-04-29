import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { caseFiles } from "@db/schema";
import { db } from "@db/db";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const caseId = Number(id);

  if (Number.isNaN(caseId)) {
    return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
  }

  const files = await db
    .select()
    .from(caseFiles)
    .where(and(eq(caseFiles.caseId, caseId), eq(caseFiles.userId, user.id)));

  return NextResponse.json(files);
}
