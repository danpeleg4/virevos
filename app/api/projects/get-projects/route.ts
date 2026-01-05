import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
        with: {
            tasks: true,
            client: {
                columns: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const projectsWithStats = projects.map(p => {
        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter(t => t.completed).length;
        const percentage =
            totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

        return {
            ...p,
            clientName: p.client?.name ?? null,
            stats: { totalTasks, completedTasks, percentage },
        };
    });

    const allClients = await db
        .select()
        .from(clients)
        .orderBy(clients.id)
        .where(eq(clients.userId, user.id));

    return NextResponse.json({ projects: projectsWithStats, allClients });
}
