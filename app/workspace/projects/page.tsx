import ProjectsPage from "./ProjectsPage";
import {db} from "@/db/db";
import {clients, users} from "@/db/schema";
import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {eq} from "drizzle-orm";

export default async function Page() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
    });

    const cli = await db.select().from(clients).orderBy(clients.id).where(eq(clients.userId, user.id,));

    return (
        <ProjectsPage
            initialProjects={projects}
            initialClients={cli}
        />
    );
}
