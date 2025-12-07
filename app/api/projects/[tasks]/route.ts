import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {db} from "@/db/db";
import {and, eq} from "drizzle-orm";
import { tasks } from "@/db/schema";

export async function GET({
                              params,
                          }: {
    params: Promise<{ id: number }>
}) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const rows = await db.select()
        .from(tasks)
        .where(
            and(
                eq(tasks.userId, user.id),
                eq(tasks.projectId, id)
            )
        );

    return NextResponse.json(rows);
}