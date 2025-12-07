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

    // Fetch all tasks with project name
    const allTasks = await db
        .select({
            tasks: tasks,          // all task fields
            projectName: projects.name // add project name
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
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
        const { title, description, priority, dueDate, project } = body as {
            title?: string;
            description?: string;
            priority?: string;
            dueDate?: string;
            project?: string | number | null;
        };

        if (!title || !title.trim()) {
            return new NextResponse("Missing title", { status: 400 });
        }

        // Validate project if provided
        let projectId: number | null = null;

        if (project !== undefined && project !== null && String(project).trim() !== "") {
            const maybeId = Number(project);
            if (!Number.isNaN(maybeId)) {
                const byId = await db
                    .select()
                    .from(projects)
                    .where(eq(projects.id, maybeId));

                if (!byId.length) {
                    return new NextResponse("Project not found", { status: 400 });
                }
                if (byId[0].userId !== user.id) {
                    return new NextResponse("Unauthorized project", { status: 403 });
                }
                projectId = maybeId;
            } else {
                // Treat as project name; find for this user
                const byName = await db
                    .select()
                    .from(projects)
                    .where(eq(projects.name, String(project)));

                if (!byName.length) {
                    return new NextResponse("Project not found", { status: 400 });
                }
                if (byName[0].userId !== user.id) {
                    return new NextResponse("Unauthorized project", { status: 403 });
                }
                projectId = byName[0].id;
            }
        }

        // Build values, omitting dueDate if empty so DB default applies
        const values: any = {
            title: title.trim(),
            description,
            priority,
            projectId,
            userId: user.id,
            status: "in-progress",
            completed: false,
        };
        if (dueDate && String(dueDate).trim() !== "") {
            values.dueDate = dueDate;
        }

        const newTask = await db.insert(tasks).values(values).returning();
        return NextResponse.json({ success: true, task: newTask[0] }, { status: 201 });

    } catch (err: unknown) {
        return new NextResponse(err instanceof Error ? err.message : 'An error occurred', {status: 500});
    }
}
