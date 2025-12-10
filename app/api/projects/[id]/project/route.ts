import {Params} from "next/dist/server/request/params";
import {db} from "@/db/db";
import {projects} from "@/db/schema";
import {eq} from "drizzle-orm";
import {NextResponse} from "next/server";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<Params> }
){
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const projectId = Number(id);
    await db.delete(projects).where(eq(projects.id, projectId))
    return NextResponse.json({success: true});
}