import { NextRequest } from "next/server";
import { db } from "@/db/db";
import { zoomTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
    await db
        .delete(zoomTokens)
        .where(eq(zoomTokens.connected, true));

    return new Response(JSON.stringify({ success: true }));
}
