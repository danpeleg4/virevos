import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteEventFromCalendar,
  getEventWithHost,
  updateEvent,
  updateEventDateTime,
} from "@/lib/workspace/calendar";
import { calendarDrizzle } from "@db/classes/calendar_db";
import { graphCalendarService } from "@/api_client/ms_graph/graph_calendar_service";
import { outlookDrizzle } from "@db/classes/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { startMeeting, markActionItemAdded } from "@/lib/workspace/meetings";
import { meetingsDrizzle } from "@db/classes/meetings_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await getEventWithHost(id, calendarDrizzle);
    if (!result) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/events/[id] GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.type === "reschedule") {
      const dateTime = new Date(body.data?.dateTime);
      if (Number.isNaN(dateTime.getTime())) {
        return NextResponse.json(
          { error: "Invalid dateTime" },
          { status: 400 }
        );
      }
      const result = await updateEventDateTime(
        id,
        dateTime,
        calendarDrizzle,
        graphCalendarService,
        outlookDrizzle,
        graphAuthService
      );
      return NextResponse.json(result);
    }

    if (body.type === "update") {
      await updateEvent(
        { ...body.data, id },
        calendarDrizzle,
        graphCalendarService,
        outlookDrizzle,
        graphAuthService
      );
      return NextResponse.json({ success: true, id });
    }

    if (body.type === "start") {
      await startMeeting(id, meetingsDrizzle);
      return NextResponse.json({ success: true, id });
    }

    if (body.type === "mark-action-item") {
      await markActionItemAdded(id, body.data?.itemIndex, meetingsDrizzle);
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/events/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await deleteEventFromCalendar(
      id,
      calendarDrizzle,
      graphCalendarService,
      outlookDrizzle,
      graphAuthService
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/events/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
