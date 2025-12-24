import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import {users, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].user_id;

    // Fetch meetings + attendees
    const rows = await db.query.meetings.findMany({
        where: eq(meetings.userId, internalUserId),
        with: {
            attendees: true,
        },
    });

    return NextResponse.json(rows);
}