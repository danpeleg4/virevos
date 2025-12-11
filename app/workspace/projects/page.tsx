"use server"
import ProjectsPage from "./ProjectsPage";
import {db} from "@/db/db";
import {clients, projects} from "@/db/schema";
import {currentUser} from "@clerk/nextjs/server";
import {eq} from "drizzle-orm";

export async function createProject(project: Project) {
    const user = await currentUser();
    if (!user?.id) {
        return
    }
    const { name, clientName, dueDate, priority } = project;
    await db
        .insert(projects)
        .values({
            name,
            clientName,
            status: "in-progress",
            dueDate,
            tasksCompleted: 0,
            totalTasks: 0,
            priority,
            health: "on-track",
            userId: user.id
        })
        .returning();
}

export default async function Page() {
    const user = await currentUser();
    if (!user?.id) {
        return
    }

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
    });

    const cli = await db.select().from(clients).orderBy(clients.id).where(eq(clients.userId, user.id,));

    return (
        <ProjectsPage
            initialProjects={projects}
            initialClients={cli}
            save={createProject}
        />
    );
}
