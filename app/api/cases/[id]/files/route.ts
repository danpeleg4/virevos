import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addFileMetadata } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

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
    const caseId = Number(id);
    if (Number.isNaN(caseId)) {
      return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
    }

    const formData = await req.formData();
    const result = await addFileMetadata(
      { caseId },
      formData,
      casesDrizzle,
      supabaseStorageClient,
      planLimitsDrizzle,
      billingDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/cases/[id]/files POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
