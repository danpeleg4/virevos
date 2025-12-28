import { currentUser } from "@clerk/nextjs/server";
import { meetingTypes } from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

import { NextResponse } from "next/server";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await db.select().from(meetingTypes).where(eq(meetingTypes.userId, user.id));
    return NextResponse.json(res);
}