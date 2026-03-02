"use server";

import {currentUser} from "@clerk/nextjs/server";
import {db} from "@db/db";
import {users} from "@db/schema";
import {eq} from "drizzle-orm";

export async function changeRecordingStatus(){
    /*
    Changes the user record meeting status between true and false in the database
     */
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");

    try {
        const [userData] = await db.select().from(users).where(eq(users.user_id, user.id));
        const recordingStatus = userData.recordingStatus;
        await db.update(users).set({
            recordingStatus: !recordingStatus
        }).where(eq(users.user_id, user.id));
    } catch (err) {
        console.error(err);
    }
}