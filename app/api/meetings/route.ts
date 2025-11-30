import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import {users, meetings, zoomTokens} from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NewMeetingInput } from "@/types/meeting";

async function getFreshZoomAccessToken(userId: string) {
    const rows = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.userId, userId))
        .limit(1);

    if (!rows.length) return null;

    const tokenData = rows[0];
    const now = Math.floor(Date.now() / 1000);

    // If token still valid → return it
    if (tokenData.expires_in > now + 30) {
        return tokenData.access_token;
    }

    // Otherwise refresh it
    const refreshed = await refreshZoomToken(tokenData.refresh_token);

    // Save new tokens in DB
    await db
        .update(zoomTokens)
        .set({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            expires_in: now + refreshed.expires_in,
        })
        .where(eq(zoomTokens.userId, userId));

    return refreshed.access_token;
}

async function refreshZoomToken(refreshToken: string) {
    const url = `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization:
                "Basic " +
                Buffer.from(
                    `${process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
                ).toString("base64"),
        },
    });

    const data = await res.json();

    if (!res.ok) {
        console.error("Zoom refresh error", data);
        throw new Error("Failed to refresh Zoom token");
    }

    return data; // contains new access_token + refresh_token
}

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].user_id;

    // Fetch meetings + attendees
    const rows = await db.query.meetings.findMany({
        where: eq(meetings.userId, internalUserId),
        with: {
            attendees: true,
        },
    });

    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const body: NewMeetingInput = await req.json();
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].user_id;

    const email = dbUser[0].email;
    const tokenRow = await db
        .select()
        .from(zoomTokens)
        .where(eq(zoomTokens.userId, user.id))
        .limit(1);

    if (tokenRow.length === 0) {
        return new NextResponse("Zoom not connected", { status: 400 });
    }

    const accessToken = await getFreshZoomAccessToken(user.id);
    const zoomRes = await fetch(
        `https://api.zoom.us/v2/users/${email}/meetings`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                topic: body.title,
                agenda: body.description ? body.description : "",
                type: 2,
                start_time: body.date + "T" + body.time + ":00Z",
                duration: body.duration,
                settings: {
                    host_video: true,
                    auto_recording: "cloud",
                    participant_video: false,
                },
            }),
        }
    );

    const zoomData = await zoomRes.json();

    if (!zoomRes.ok) {
        console.error("Zoom error:", zoomData);
        return new NextResponse("Zoom API error", { status: 500 });
    }

    // Insert meeting
    const inserted = await db
        .insert(meetings)
        .values({
            id: zoomData.id,
            title: body.title,
            description: body.description,
            link: zoomData.join_url,
            date: body.date,
            time: body.time,
            duration: body.duration,
            type: body.type,
            status: body.status,
            hasNotes: body.hasNotes ?? false,
            hasTranscript: body.hasTranscript ?? false,
            autoRescheduled: body.autoRescheduled ?? false,
            conflictReason: body.conflictReason ?? null,
            userId: internalUserId
        })
        .returning();
    return NextResponse.json(inserted[0]);
}
