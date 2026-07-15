import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  createScheduledEmail,
  deleteScheduledEmail,
  getScheduledEmails,
  sendScheduledEmailNow,
} from "@/lib/scheduled_emails";
import { scheduledEmailsDrizzle } from "@db/scheduled_emails_db";
import { scheduledEmailService } from "@/api_client/ms_graph/scheduled_email_service";
import { outlookDrizzle } from "@db/outlook_db";
import { graphAuthService } from "@/api_client/ms_graph/graph_auth_service";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await getScheduledEmails(scheduledEmailsDrizzle);

    return NextResponse.json({ scheduledEmails: rows });
  } catch (err) {
    console.error("[api/scheduled-emails GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to fetch scheduled emails" },
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
    if (body.type == "send-now") {
      await sendScheduledEmailNow(
        body.data,
        scheduledEmailsDrizzle,
        scheduledEmailService,
        outlookDrizzle,
        graphAuthService
      );
    } else if (body.type == "schedule") {
      await createScheduledEmail(body.data, scheduledEmailsDrizzle);
    } else {
      return NextResponse.json({ success: false });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/scheduled-emails POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to create scheduled email" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const idParam = searchParams.get("id");
    if (!idParam) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid id parameter" },
        { status: 400 }
      );
    }

    await deleteScheduledEmail(id, scheduledEmailsDrizzle);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/scheduled-emails DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete scheduled email" },
      { status: 500 }
    );
  }
}
