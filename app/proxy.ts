import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// This runs before every request
export function proxy(req: NextRequest, _ev: NextFetchEvent) {
    const pathname = req.nextUrl.pathname;

    const hideNav = pathname.startsWith("/");

    const res = NextResponse.next();

    if (hideNav) {
        res.headers.set("x-hide-nav", "true");
    }

    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};