import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createSetupIntent } from "@/lib/workspace/billing";
import { billingDrizzle } from "@db/billing_db";
import { userDrizzle } from "@db/user_db";
import { stripeApiClient } from "@/api_client/stripe_client";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const clientSecret = await createSetupIntent(
      billingDrizzle,
      stripeApiClient,
      userDrizzle
    );
    return NextResponse.json({ clientSecret });
  } catch (err) {
    console.error("[api/billing/setup-intent] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
