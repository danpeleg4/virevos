import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addMeetingToCalendar, getEvents } from "@/lib/workspace/calendar";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const rows = await getEvents(calendarDrizzle);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/events GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const inserted = await addMeetingToCalendar(
      body,
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
    return NextResponse.json(inserted);
  } catch (err) {
    console.error("[api/events POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
