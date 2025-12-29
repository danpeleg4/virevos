"use server"

import {db} from "@/db/db";
import {zoomTokens} from "@/db/schema";
import {eq} from "drizzle-orm";

export async function getFreshZoomAccessToken(userId: string) {
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

export async function refreshZoomToken(refreshToken: string) {
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