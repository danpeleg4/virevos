import { events } from "@repo/db/schema";
import { db } from "@repo/db/db";
import { eq } from "drizzle-orm";

type ScheduleEvent = {
  userId: string;
  id: string;
};

/*
virevos-schedule-meeting lambda function
*/
export const handler = async (event: ScheduleEvent) => {
  console.log("User Id: ");
  console.log(event.userId);
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
