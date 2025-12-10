import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { notes } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import {Params} from "next/dist/server/request/params";

export async function GET(
    req: Request,
    { params }: { params: Promise<Params> }
){
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const projectId = Number(id);
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

    return NextResponse.json(data);
}