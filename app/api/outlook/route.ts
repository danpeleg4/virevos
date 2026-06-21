import { NextResponse } from "next/server";
import { getOutlookAuthUrl } from "@/lib/outlook/outlook_access";

export const OUTLOOK_STATE_COOKIE = "outlook_oauth_state";

export async function GET() {
  const state = crypto.randomUUID();
  const url = getOutlookAuthUrl(state);

  const response = NextResponse.redirect(url);
  response.cookies.set(OUTLOOK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
