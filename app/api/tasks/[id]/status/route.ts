import { NextResponse } from "next/server";
import { db } from "@/db/db";
import {projects, tasks} from "@/db/schema";
import {eq, sql} from "drizzle-orm";

interface Params {
    id: string;
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<Params> } // <-- params is a Promise
) {
    const resolvedParams = await params; // <-- unwrap the promise
    const { id } = resolvedParams;

    const taskId = Number(id);
    if (isNaN(taskId)) {
        return new NextResponse("Invalid task id", { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!["todo", "in-progress", "completed"].includes(status)) {
        return new NextResponse("Invalid status", { status: 400 });
    }

// get existing task
    const existing = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
    });

    if (!existing) {
        return new NextResponse("Task not found", { status: 404 });
    }

    const prevStatus = existing.status;

    await db
        .update(tasks)
        .set({ status, completed: status === "completed" })
        .where(eq(tasks.id, taskId));

    // only update if status changed
    if (prevStatus !== status) {
        const diff = status === "completed" ? 1 : -1;

        await db
            .update(projects)
            .set({
                tasksCompleted: sql`${projects.tasksCompleted} + ${diff}`
            })
            .where(eq(projects.id, Number(existing.projectId)));
    }


    return NextResponse.json({ success: true, id: taskId, status });
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<Params> }
) {
    const resolvedParams = await params; // <-- unwrap the promise
    const { id } = resolvedParams;
    const taskId = Number(id);
    if (isNaN(taskId)) {
        return new NextResponse("Invalid task id", { status: 400 });
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));
    return NextResponse.json({ success: true, id: taskId });
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<Params> }
) {
    const { id } = await params;
    const taskId = Number(id);

    if (isNaN(taskId)) {
        return new NextResponse("Invalid task id", { status: 400 });
    }

    const body = await req.json();
    const { title, description } = body;

    await db
        .update(tasks)
        .set({
            title,
            description,
        })
        .where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true });
}