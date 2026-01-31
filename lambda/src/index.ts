import {events, users} from "@/db/schema";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

/*
virevos-schedule-meeting lambda function
*/
export const handler = async (event: any) => {
    console.log("User Id: ")
    console.log(event.userId);
    try {
        //await db.update(events).set({
        //    status: "active"
        //}).where(eq(events.userId, event.userId));
        //
        await db.insert(users).values({
            user_id: event.userId,
            name: "John",
            email: "john@gmail.com"
        })
    } catch (error) {
        console.error(error);
    }
};
