import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/user";

export async function GET(): Promise<NextResponse> {
  try {
    const profile = await getUserProfile();
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[api/user/profile] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
