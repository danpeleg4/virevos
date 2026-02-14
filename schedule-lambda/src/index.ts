import { events } from "@repo/db/schema";
import { db } from "@repo/db/db";
import { eq } from "drizzle-orm";

/*
virevos-schedule-meeting lambda function
*/
export const handler = async (event: any) => {
  console.log("User Id: ");
  console.log(event.userId);
  const year = new Date().getFullYear();
  try {
    await db
      .update(events)
      .set({
        status: "active",
      })
      .where(eq(events.id, event.id));
  } catch (error) {
    console.error(error);
  }
};
