import { google } from "googleapis";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { googleTokens, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { performFullSync, setupWatchChannel } from "@/lib/google_sync";

/*
Authorized Google redirect URIs
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user row exists (Clerk webhook may not have fired yet)
  await db
    .insert(users)
    .values({
      user_id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null,
    })
    .onConflictDoNothing({ target: users.user_id });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);
  const expiresAt = tokens.expiry_date ?? Date.now() + 3600 * 1000;

  const existingToken = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, user.id))
    .limit(1);

  if (existingToken.length > 0) {
    await db
      .update(googleTokens)
      .set({
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || existingToken[0].refresh_token,
        expires_in: expiresAt,
        connected: true,
      })
      .where(eq(googleTokens.userId, user.id));
  } else {
    await db.insert(googleTokens).values({
      userId: user.id,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expires_in: expiresAt,
      connected: true,
    });
  }

  // Trigger initial full sync and register push notification channel
  try {
    await performFullSync(user.id);
  } catch (err) {
    console.error("[google/callback] Initial full sync failed:", err);
  }

  try {
    await setupWatchChannel(user.id);
  } catch (err) {
    console.error("[google/callback] Watch channel setup failed:", err);
  }

  return NextResponse.redirect(
    new URL(
      "/workspace/calendar?tab=integrations",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    )
  );
}
