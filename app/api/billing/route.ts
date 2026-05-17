import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getBillingOverview } from "@/lib/workspace/billing";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const overview = await getBillingOverview();
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[api/billing] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
