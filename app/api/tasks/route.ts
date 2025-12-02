import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { projects, tasks } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Get all projects for this user
    const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, user.id));

    if (userProjects.length === 0) {
        return NextResponse.json([]); // no projects → no tasks
    }

    // 2. Extract IDs
    const projectIds = userProjects.map((p) => p.id);

    // 3. Get tasks where project_id is in the user's project IDs
    const allTasks = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.project_id, projectIds));

    return NextResponse.json(allTasks);
}