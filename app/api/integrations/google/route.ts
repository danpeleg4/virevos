import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { googleTokens } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.json();
    
    if (data.action === "disconnect") {
        await db
            .delete(googleTokens)
            .where(eq(googleTokens.userId, user.id));

        return NextResponse.json({ success: true });
    }

    if (data.action === "status") {
        const rows = await db
            .select()
            .from(googleTokens)
            .where(eq(googleTokens.userId, user.id))
            .limit(1);

        return NextResponse.json({
            connected: rows.length > 0 && rows[0].connected
        });
    }

    return new NextResponse("Method not allowed", { status: 405 });
}
