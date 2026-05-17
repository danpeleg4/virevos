import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { caseFiles, cases } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: caseFiles.id,
        name: caseFiles.name,
        path: caseFiles.path,
        size: caseFiles.size,
        mimeType: caseFiles.mimeType,
        createdAt: caseFiles.createdAt,
        caseId: caseFiles.caseId,
        caseName: cases.name,
      })
      .from(caseFiles)
      .leftJoin(cases, eq(caseFiles.caseId, cases.id))
      .where(eq(caseFiles.userId, user.id))
      .limit(100);

    return NextResponse.json({ files: rows });
  } catch (err) {
    console.error("[api/files/user-files GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
