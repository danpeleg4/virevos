import { NextRequest, NextResponse } from "next/server";
import { createPortalBooking } from "@/lib/portal_bookings";
import { portalBookingsDrizzle } from "@db/portal_bookings_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const body = await req.json();
    const result = await createPortalBooking(
      token,
      body,
      portalBookingsDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal/[token]/bookings POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
