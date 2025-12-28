import { currentUser } from "@clerk/nextjs/server";
import { meetingTypes } from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        throw new Error("Unauthorized");
    }

    const res = await db.select().from(meetingTypes).where(eq(meetingTypes.userId, user.id));
    return res;
}