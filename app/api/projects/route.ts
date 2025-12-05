import {NextRequest, NextResponse} from "next/server";
import {db} from "@/db/db";
import {projects} from "@/db/schema";

export async function POST(req: NextRequest, res: NextResponse){
    const body = await req.json();
    const { id, name, client, status, progress, dueDate, tasksCompleted, totalTasks, priority, health  } = body;
    if (!id || !name || !client || !status || !progress || !dueDate || !tasksCompleted || !totalTasks || !priority || !health) {
        return NextResponse.json({ message: "Missing data" }, { status: 400 });
    }


    const created = await db.insert(projects).values({
        id, name, client, status, progress, dueDate, tasksCompleted, totalTasks, priority, health
    })
}