import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteCase, getCaseSummary, updateCase } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

function parseCaseId(id: string): number | null {
  const caseId = Number(id);
  return Number.isNaN(caseId) ? null : caseId;
}

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
    const caseId = parseCaseId(id);
    if (caseId === null) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    const summary = await getCaseSummary(caseId, casesDrizzle);

    if (!summary) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
    const caseId = parseCaseId(id);
    if (caseId === null) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    const body = await req.json();
    await updateCase({ ...body, id: caseId }, casesDrizzle);
    return NextResponse.json({ success: true, id: caseId });
  } catch (err) {
    console.error("[api/cases/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update case" },
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
    const caseId = parseCaseId(id);
    if (caseId === null) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    await deleteCase(caseId, casesDrizzle, supabaseStorageClient);
    return NextResponse.json({ success: true, id: caseId });
  } catch (err) {
    console.error("[api/cases/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
