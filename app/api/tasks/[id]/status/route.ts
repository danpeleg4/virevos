import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Params {
    id: string;
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<Params> } // <-- params is a Promise
) {
    const resolvedParams = await params; // <-- unwrap the promise
    const { id } = resolvedParams;

    const user = await currentUser();
    if (!user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const taskId = Number(id);
    if (isNaN(taskId)) {
        return new NextResponse("Invalid task id", { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!["todo", "in-progress", "completed"].includes(status)) {
        return new NextResponse("Invalid status", { status: 400 });
    }

    await db
        .update(tasks)
        .set({ status })
        .where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true, id: taskId, status });
}
