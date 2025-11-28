import { NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/db/db";
import { zoomTokens } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

/** Zoom redirect URL Path: /api/integrations/zoom **/

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID!;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_ZOOM_REDIRECT_URI!;

    // Exchange code for access token
    const tokenResponse = await axios.post(
        "https://zoom.us/oauth/token",
        new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri
        }),
        {
            headers: {
                Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Check if user already has zoom tokens
    const existing = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.userId, user.id));

    if (existing.length > 0) {
        // Update existing tokens
        await db
            .update(zoomTokens)
            .set({
                access_token,
                refresh_token,
                expires_in,
            })
            .where(eq(zoomTokens.userId, user.id));
    } else {
        // Insert new tokens
        await db.insert(zoomTokens).values({
            userId: user.id,
            access_token,
            refresh_token,
            expires_in,
            connected: true
        });
    }

    return NextResponse.redirect("https://www.virevos.com/workspace/scheduling");
}
