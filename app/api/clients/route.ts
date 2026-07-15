import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addAClient, getClients } from "@/lib/workspace/clients";
import { clientsDrizzle } from "@db/clients_db";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await getClients(clientsDrizzle);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // addAClient reports failures as { message } — pass it through verbatim
    // so the client-side handling stays unchanged
    const result = await addAClient(
      body,
      clientsDrizzle,
      planLimitsDrizzle,
      billingDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/clients POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { message: err.message },
        { status: err.status }
      );
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
