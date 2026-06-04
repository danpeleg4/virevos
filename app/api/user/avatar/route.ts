import { NextResponse } from "next/server";
import { getAvatarUrl } from "@/lib/user";

export async function GET(): Promise<NextResponse> {
  try {
    const result = await getAvatarUrl();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/user/avatar] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
