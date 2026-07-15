import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  cancelSubscription,
  changePlan,
  createSubscription,
  getBillingOverview,
  registerFreePlan,
  resubscribe,
  updatePaymentMethod,
} from "@/lib/workspace/billing";
import { billingDrizzle } from "@db/billing_db";
import { userDrizzle } from "@db/user_db";
import { stripeApiClient } from "@/api_client/stripe_client";
import { ValidationError } from "@/lib/util/validation";

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const overview = await getBillingOverview(billingDrizzle, stripeApiClient);
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[api/billing] Error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.type === "create-subscription") {
      await createSubscription(
        body.data,
        billingDrizzle,
        stripeApiClient,
        userDrizzle
      );
      return NextResponse.json({ success: true });
    }
    if (body.type === "register-free") {
      await registerFreePlan(userDrizzle);
      return NextResponse.json({ success: true });
    }
    if (body.type === "change-plan") {
      await changePlan(body.data, billingDrizzle, stripeApiClient);
      return NextResponse.json({ success: true });
    }
    if (body.type === "cancel") {
      await cancelSubscription(billingDrizzle, stripeApiClient);
      return NextResponse.json({ success: true });
    }
    if (body.type === "resubscribe") {
      await resubscribe(billingDrizzle, stripeApiClient);
      return NextResponse.json({ success: true });
    }
    if (body.type === "update-payment-method") {
      await updatePaymentMethod(
        body.data?.paymentMethodId,
        billingDrizzle,
        stripeApiClient
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/billing POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Billing call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
