import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { projectFiles, projects } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: projectFiles.id,
        name: projectFiles.name,
        path: projectFiles.path,
        size: projectFiles.size,
        mimeType: projectFiles.mimeType,
        createdAt: projectFiles.createdAt,
        projectId: projectFiles.projectId,
        projectName: projects.name,
      })
      .from(projectFiles)
      .leftJoin(projects, eq(projectFiles.projectId, projects.id))
      .where(eq(projectFiles.userId, user.id))
      .limit(100);

    return NextResponse.json({ files: rows });
  } catch (err) {
    console.error("[api/files/user-files GET]", err);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
