import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { projectFiles } from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const projectId = Number(id);

    if (Number.isNaN(projectId)) {
        return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, projectId));

    return NextResponse.json(files);
}
