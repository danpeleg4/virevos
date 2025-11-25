import {db} from "@/db/db";
import {events} from "@/db/schema";
import {NextRequest} from "next/server";

export async function GET(req: NextRequest) {
    const data = await db.insert(events).values({
        id: 1,
        event: "string"
    });
    console.log(data);
    return new Response("ok");
}