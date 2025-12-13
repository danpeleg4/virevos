"use server"
import ProjectsPage from "./ProjectsPage";
import {db} from "@/db/db";
import {clients, notes, projects, tasks} from "@/db/schema";
import {currentUser} from "@clerk/nextjs/server";
import {and, desc, eq, sql} from "drizzle-orm";

export async function deleteProject(projectId: number) {
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    await db.delete(notes).where(eq(notes.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
}

export async function getProjectTasks(id: number): Promise<Task[]> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    return db
        .select()
        .from(tasks)
        .where(
            and(eq(tasks.userId, user.id), eq(tasks.projectId, id))
        );
}

export async function addProjectTasksAction(task: Task): Promise<Task> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    const {title, description, priority, dueDate, projectId} = task;
    const values = {
        title: title.trim(),
        description,
        priority,
        projectId,
        userId: user.id,
        status: "in-progress" as const,
        completed: false,
        dueDate: dueDate || "2025-01-01",
    };

    const newTask = await db.insert(tasks).values(values).returning();
    if (newTask.length > 0) {
        await db
            .update(projects)
            .set({
                totalTasks: sql`${projects.totalTasks} + 1`
            })
            .where(eq(projects.id, Number(projectId)));
    }
    return newTask[0];
}

export async function getNotes(projectId: number): Promise<ProjectNote[]> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    return db
        .select()
        .from(notes)
        .where(
            and(
                eq(notes.userId, user.id),
                eq(notes.projectId, projectId)
            )
        )
        .orderBy(desc(notes.id));
}

export async function createProject(project: Project): Promise<Project> {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const inserted = await db
        .insert(projects)
        .values({
            ...project,
            userId: user.id
        })
        .returning();

    return inserted[0];
}

export async function addNotes(
    newNote: string,
    projectId: number
): Promise<ProjectNote> {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    const inserted = await db
        .insert(notes)
        .values({
            content: newNote,
            userId: user.id,
            projectId,
        })
        .returning();

    return inserted[0];
}

export default async function Page() {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
    });

    const cli = await db.select().from(clients).orderBy(clients.id).where(eq(clients.userId, user.id,));
    return (
        <ProjectsPage
            initialProjects={projects}
            initialClients={cli}
            save={createProject}
            addNotes={addNotes}
            getNotes={getNotes}
            getProjectTasks={getProjectTasks}
            deleteProject={deleteProject}
            addProjectTasks={addProjectTasksAction}
        />
    );
}
