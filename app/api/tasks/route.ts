import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { projects, tasks } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, user.id));

    return NextResponse.json(allTasks);
}

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { title, description, priority, dueDate, project } = body;

        if (!title) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Validate project if provided
        let projectId = null;

        if (project) {
            const foundProject = await db
                .select()
                .from(projects)
                .where(eq(projects.id, Number(project)));

            if (!foundProject.length) {
                return new NextResponse("Project does not exist", { status: 400 });
            }

            if (foundProject[0].userId !== user.id) {
                return new NextResponse("Unauthorized project", { status: 403 });
            }

            projectId = Number(project);
        }

        const newTask = await db
            .insert(tasks)
            .values({
                title,
                description,
                priority,
                dueDate,
                projectId: projectId,
                userId: user.id,
                status: "in-progress",
                completed: false,
            })
            .returning();

        return NextResponse.json({ success: true, task: newTask[0] });

    } catch (err: unknown) {
        return new NextResponse(err instanceof Error ? err.message : 'An error occurred', {status: 500});
    }
}
