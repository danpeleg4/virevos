import { getCurrentUser } from "@/lib/supabase/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPortalBookings } from "@/lib/portal/portal_bookings";
import { portalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import { ValidationError } from "@/lib/util/validation";

const bookingsType = async (userId: string) => {
  try {
    const bookings = await getPortalBookings(userId, portalBookingsDrizzle);
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("[api/portal/bookings GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");
  if (type == "bookings") return await bookingsType(user.id);

  return NextResponse.json({ error: "No type found" });
}
