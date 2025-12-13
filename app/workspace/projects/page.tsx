"use server"
import ProjectsPage from "./ProjectsPage";
import {db} from "@/db/db";
import {clients, notes, projects} from "@/db/schema";
import {currentUser} from "@clerk/nextjs/server";
import {and, desc, eq} from "drizzle-orm";
import {NextResponse} from "next/server";

export async function getNotes(projectId: number) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await db
        .select()
        .from(notes)
        .where(
            and(
                eq(notes.userId, user.id),
                eq(notes.projectId, projectId)
            )
        )
        .orderBy(desc(notes.id));

    return data;
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
            addNotes={addNotes}
            getNotes={getNotes}
        />
    );
}
