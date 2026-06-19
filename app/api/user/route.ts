import { NextRequest, NextResponse } from "next/server";
import {
  getAvatarUrl,
  getProductUpdatesPreference,
  getUserProfile,
  getWeeklySummaryPreference,
} from "@/lib/user";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  try {
    if (type == "avatar") return NextResponse.json(await getAvatarUrl());
    if (type == "product-updates")
      return NextResponse.json(await getProductUpdatesPreference());
    if (type == "profile") return NextResponse.json(await getUserProfile());
    if (type == "weekly-summary")
      return NextResponse.json(await getWeeklySummaryPreference());

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/user GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
