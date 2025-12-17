import { NextResponse } from "next/server";
import { db } from "@/db/db";
import {projects, tasks} from "@/db/schema";
import {eq, sql} from "drizzle-orm";

interface Params {
    id: string;
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