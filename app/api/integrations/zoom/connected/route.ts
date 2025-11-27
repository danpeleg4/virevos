import { NextRequest } from "next/server";
import { db } from "@/db/db";
import { zoomTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const zoomRows = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.connected, true));

    const zoomConnected = zoomRows.length > 0;

    return new Response(
        JSON.stringify({
            zoom: zoomConnected,
            googleMeetsConnected: false // placeholder until implemented
        }),
        { status: 200 }
    );
}
