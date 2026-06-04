import { NextResponse } from "next/server";
import { getWeeklySummaryPreference } from "@/lib/user";

export async function GET(): Promise<NextResponse> {
  try {
    const enabled = await getWeeklySummaryPreference();
    return NextResponse.json(enabled);
  } catch (err) {
    console.error("[api/user/weekly-summary] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
