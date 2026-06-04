import { NextResponse } from "next/server";
import { getProductUpdatesPreference } from "@/lib/user";

export async function GET(): Promise<NextResponse> {
  try {
    const enabled = await getProductUpdatesPreference();
    return NextResponse.json(enabled);
  } catch (err) {
    console.error("[api/user/product-updates] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
