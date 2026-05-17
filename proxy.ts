import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function middleware(req: NextRequest) {
  const { supabaseResponse, user } = await updateSession(req);

  const { pathname } = req.nextUrl;

  // Don't redirect server action calls — they POST to the page URL and must
  // reach their handler. Without this guard, finishing OTP on /onboard would
  // redirect the registerFreePlan action call to /workspace/dashboard.
  const isServerAction = req.headers.has("next-action");
  if (isServerAction) return supabaseResponse;

  if (pathname.startsWith("/workspace") && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/onboard") && user) {
    return NextResponse.redirect(new URL("/workspace/dashboard", req.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
