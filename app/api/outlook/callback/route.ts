import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { outlookTokens, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { exchangeOutlookCode } from "@/lib/outlook/outlook_access";
import {
  performFullSync,
  setupSubscriptions,
} from "@/lib/outlook/outlook_sync";
import { OUTLOOK_STATE_COOKIE } from "@/app/api/outlook/route";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const state = searchParams.get("state");
  const expectedState = readCookie(req, OUTLOOK_STATE_COOKIE);
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .insert(users)
    .values({
      userId: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? null,
    })
    .onConflictDoNothing({ target: users.userId });

  const { access_token, refresh_token, expires_at } =
    await exchangeOutlookCode(code);

  const existingToken = await db
    .select()
    .from(outlookTokens)
    .where(eq(outlookTokens.userId, user.id))
    .limit(1);

  if (existingToken.length > 0) {
    await db
      .update(outlookTokens)
      .set({
        accessToken: access_token,
        refreshToken: refresh_token || existingToken[0].refreshToken,
        expiresIn: expires_at,
        connected: true,
      })
      .where(eq(outlookTokens.userId, user.id));
  } else {
    await db.insert(outlookTokens).values({
      userId: user.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_at,
      connected: true,
    });
  }

  try {
    await performFullSync(user.id);
  } catch (err) {
    console.error("[outlook/callback] Initial full sync failed:", err);
  }

  try {
    await setupSubscriptions(user.id);
  } catch (err) {
    console.error("[outlook/callback] Subscription setup failed:", err);
  }

  const response = NextResponse.redirect(
    new URL(
      "/workspace/settings",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    )
  );
  response.cookies.delete(OUTLOOK_STATE_COOKIE);

  return response;
}
