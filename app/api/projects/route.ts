import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { projects } from "@/db/schema";
import {currentUser} from "@clerk/nextjs/server";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
    });

    return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, client, dueDate, priority } = body;

    if (!name || !client || !dueDate || !priority) {
        return NextResponse.json({ message: "Missing data" }, { status: 400 });
    }

    const created = await db
        .insert(projects)
        .values({
            name,
            clientName: client,
            status: "in-progress",
            dueDate,
            tasksCompleted: 0,
            totalTasks: 0,
            priority,
            health: "on-track",
            userId: user.id
        })
        .returning();

    return NextResponse.json(created[0]);
}