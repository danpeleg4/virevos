import { getCurrentUser } from "@/lib/supabase/auth";
import { getCasesWithStats } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { ValidationError } from "@/lib/util/validation";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getCasesWithStats(casesDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/cases/get-cases GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}
