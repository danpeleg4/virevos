import {db} from "@/db/db";
import {events} from "@/db/schema";

export async function GET() {
    const data = await db.insert(events).values({
        id: 1,
        event: "string"
    });
    console.log(data);
    return new Response("ok");
}