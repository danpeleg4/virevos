import axios from "axios";
import { db } from "@db/db";
import { outlookTokens } from "@db/schema";
import { eq } from "drizzle-orm";

const TOKEN_URL = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

export const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
  "Mail.ReadWrite",
  "MailboxSettings.Read",
].join(" ");

export function getOutlookAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
    response_mode: "query",
    scope: OUTLOOK_SCOPES,
    prompt: "consent",
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeOutlookCode(
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
    scope: OUTLOOK_SCOPES,
  });

  const response = await axios.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>(TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const { access_token, refresh_token, expires_in } = response.data;
  const expires_at = Date.now() + expires_in * 1000;

  return { access_token, refresh_token, expires_at };
}

export async function getFreshOutlookAccessToken(
  userId: string
): Promise<string | null> {
  const rows = await db
    .select()
    .from(outlookTokens)
    .where(eq(outlookTokens.userId, userId))
    .limit(1);

  if (!rows.length) return null;

  const tokenData = rows[0];
  const now = Date.now();

  if (tokenData.expires_in > now + 30000) {
    console.log("[getFreshOutlookAccessToken] stored token length:", tokenData.access_token?.length, "expires_in:", tokenData.expires_in, "now:", now);
    return tokenData.access_token;
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: tokenData.refresh_token,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES,
    });

    const response = await axios.post<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    }>(TOKEN_URL, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expires_at = Date.now() + expires_in * 1000;

    await db
      .update(outlookTokens)
      .set({
        access_token,
        expires_in: expires_at,
        connected: true,
        ...(refresh_token ? { refresh_token } : {}),
      })
      .where(eq(outlookTokens.userId, userId));

    return access_token;
  } catch (error) {
    console.error("[outlook_access] Token refresh error:", error);
    return null;
  }
}
