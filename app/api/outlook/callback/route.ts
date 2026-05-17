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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .insert(users)
    .values({
      user_id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? null,
    })
    .onConflictDoNothing({ target: users.user_id });

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
        access_token,
        refresh_token: refresh_token || existingToken[0].refresh_token,
        expires_in: expires_at,
        connected: true,
      })
      .where(eq(outlookTokens.userId, user.id));
  } else {
    await db.insert(outlookTokens).values({
      userId: user.id,
      access_token,
      refresh_token,
      expires_in: expires_at,
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

  return NextResponse.redirect(
    new URL(
      "/workspace/settings",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    )
  );
}
