import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import { cases, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const caseId = Number(id);
    if (Number.isNaN(caseId)) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    const result = await db
      .select({
        id: cases.id,
        name: cases.name,
        clientId: cases.clientId,
        clientName: clients.name,
        dueDate: cases.dueDate,
        priority: cases.priority,
        status: cases.status,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .where(and(eq(cases.id, caseId), eq(cases.userId, user.id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
