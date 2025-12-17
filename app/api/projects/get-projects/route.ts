import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.query.projects.findMany({
        where: (fields, { eq }) => eq(fields.userId, user.id),
    });
    const allClients = await db
        .select()
        .from(clients)
        .orderBy(clients.id)
        .where(eq(clients.userId, user.id));

    return NextResponse.json({ projects, allClients });
}