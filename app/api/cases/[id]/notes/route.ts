import { getCurrentUser } from "@/lib/supabase/auth";
import { addCaseNotes, getCaseNotes } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";
import {
  MAX_NOTES,
  requireString,
  ValidationError,
} from "@/lib/util/validation";
import { NextRequest, NextResponse } from "next/server";

function parseCaseId(id: string): number | null {
  const caseId = Number(id);
  return Number.isNaN(caseId) ? null : caseId;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const caseId = parseCaseId(id);
  if (caseId === null) {
    return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
  }

  try {
    const data = await getCaseNotes(caseId, casesDrizzle);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/cases/[id]/notes GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const caseId = parseCaseId(id);
    if (caseId === null) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    const body = await req.json();
    const note = requireString(body?.note, "note", MAX_NOTES);
    await addCaseNotes(note, caseId, casesDrizzle);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/cases/[id]/notes POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}
