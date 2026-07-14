import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { scheduledEmails } from "@db/schema";
import { eq, asc } from "drizzle-orm";
import {
  createScheduledEmail,
  deleteScheduledEmail,
  sendScheduledEmailNow,
} from "@/lib/scheduled_emails";
import { DrizzleInstance } from "@db/db";
import { scheduledEmailService } from "@/api_client/axios_api_client";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(scheduledEmails)
      .where(eq(scheduledEmails.userId, user.id))
      .orderBy(asc(scheduledEmails.scheduledAt));

    return NextResponse.json({ scheduledEmails: rows });
  } catch (err) {
    console.error("[api/scheduled-emails GET]", err);
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
        DrizzleInstance,
        scheduledEmailService
      );
    } else if (body.type == "schedule") {
      await createScheduledEmail(body.data, DrizzleInstance);
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

    await deleteScheduledEmail(id, DrizzleInstance);
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
