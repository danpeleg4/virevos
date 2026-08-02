import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  acceptBookingWithCalendar,
  updateBookingStatus,
} from "@/lib/portal/portal_bookings";
import { portalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { ValidationError } from "@/lib/util/validation";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const bookingId = Number(id);
    if (Number.isNaN(bookingId)) {
      return NextResponse.json(
        { error: "Invalid booking id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (body.type === "accept") {
      await acceptBookingWithCalendar(
        bookingId,
        portalBookingsDrizzle,
        calendarDrizzle,
        graphCalendarService,
        outlookDrizzle,
        graphAuthService
      );
      return NextResponse.json({ success: true });
    }

    if (body.type === "status") {
      await updateBookingStatus(
        bookingId,
        body.data?.status,
        portalBookingsDrizzle
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/portal-bookings/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
