import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createCase } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const created = await createCase(
      body,
      casesDrizzle,
      planLimitsDrizzle,
      billingDrizzle
    );
    return NextResponse.json(created);
  } catch (err) {
    console.error("[api/cases POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Failed to create case";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
