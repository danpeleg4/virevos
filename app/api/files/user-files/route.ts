import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getUserFiles } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await getUserFiles(casesDrizzle);

    return NextResponse.json({ files: rows });
  } catch (err) {
    console.error("[api/files/user-files GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
