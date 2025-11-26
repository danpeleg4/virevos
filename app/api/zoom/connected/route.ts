import {NextRequest} from "next/server";
import {db} from "@/db/db";
import {zoomTokens} from "@/db/schema";
import {eq} from "drizzle-orm";

export async function GET(request: NextRequest) {
    const connected = await db.select().from(zoomTokens).where(eq(zoomTokens.connected, true))
    return new Response(JSON.stringify(connected))
}