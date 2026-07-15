import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { outlookDrizzle } from "@db/outlook_db";
import { calendarDrizzle } from "@db/calendar_db";
import { userDrizzle } from "@db/user_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { graphMailService } from "@/api_client/ms_graph/graph_mail_service";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { openAIClient } from "@/api_client/openai_client";
import { exchangeOutlookCode } from "@/lib/outlook/outlook_access";
import {
  performFullSync,
  setupSubscriptions,
} from "@/lib/outlook/outlook_sync";
import { ensureUserRow } from "@/lib/user";
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

  await ensureUserRow(userDrizzle);

  const { access_token, refresh_token, expires_at } = await exchangeOutlookCode(
    code,
    graphAuthService
  );

  const existingToken = await outlookDrizzle.getTokenByUserId(user.id);

  if (existingToken.length > 0) {
    await outlookDrizzle.updateToken(user.id, {
      accessToken: access_token,
      refreshToken: refresh_token || existingToken[0].refreshToken,
      expiresIn: expires_at,
      connected: true,
    });
  } else {
    await outlookDrizzle.insertToken({
      userId: user.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_at,
      connected: true,
    });
  }

  try {
    await performFullSync(
      user.id,
      outlookDrizzle,
      calendarDrizzle,
      graphAuthService,
      graphMailService,
      supabaseStorageClient,
      openAIClient
    );
  } catch (err) {
    console.error("[outlook/callback] Initial full sync failed:", err);
  }

  try {
    await setupSubscriptions(
      user.id,
      outlookDrizzle,
      graphAuthService,
      graphMailService
    );
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
