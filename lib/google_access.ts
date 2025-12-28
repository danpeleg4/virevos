import { google } from "googleapis";
import { db } from "@/db/db";
import { googleTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function getFreshGoogleAccessToken(userId: string) {
    const rows = await db
        .select()
        .from(googleTokens)
        .where(eq(googleTokens.userId, userId))
        .limit(1);

    if (!rows.length) return null;

    const tokenData = rows[0];
    const now = Date.now();

    // If token still valid → return it
    // google tokens expires_in is usually an absolute timestamp in ms when using oauth2Client.getToken
    if (tokenData.expires_in > now + 30000) {
        return tokenData.access_token;
    }

    // Otherwise refresh it
    oauth2Client.setCredentials({
        refresh_token: tokenData.refresh_token,
    });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        const updateData: any = {
            access_token: credentials.access_token,
            expires_in: credentials.expiry_date,
            connected: true,
        };
        
        if (credentials.refresh_token) {
            updateData.refresh_token = credentials.refresh_token;
        }

        await db
            .update(googleTokens)
            .set(updateData)
            .where(eq(googleTokens.userId, userId));

        return credentials.access_token;
    } catch (error) {
        console.error("Google refresh error", error);
        return null;
    }
}
