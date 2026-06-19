import { NextRequest, NextResponse } from "next/server";
import {
  getAvatarUrl,
  getProductUpdatesPreference,
  getUserProfile,
  getWeeklySummaryPreference,
} from "@/lib/user";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");

  if (type == "avatar")
    return NextResponse.json(await getAvatarUrl());
  if (type == "product-updates")
    return NextResponse.json(await getProductUpdatesPreference());
  if (type == "profile")
    return NextResponse.json(await getUserProfile());
  if (type == "weekly-summary")
    return NextResponse.json(await getWeeklySummaryPreference());

  return NextResponse.json({ error: "No type found" }, { status: 400 });
}
