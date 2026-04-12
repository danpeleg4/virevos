import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { outlookEmails } from "@db/schema";
import { and, eq } from "drizzle-orm";
import axios from "axios";
import { getFreshOutlookAccessToken } from "@/lib/outlook_access";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(outlookEmails)
    .where(and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, user.id)))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(outlookEmails)
    .where(and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, user.id)))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = rows[0];
  const body = await req.json() as {
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
  };

  const dbUpdate: Partial<typeof body> = {};
  const graphUpdate: Record<string, unknown> = {};

  if (body.isRead !== undefined) {
    dbUpdate.isRead = body.isRead;
    graphUpdate.isRead = body.isRead;
  }

  if (body.isStarred !== undefined) {
    dbUpdate.isStarred = body.isStarred;
    graphUpdate.flag = { flagStatus: body.isStarred ? "flagged" : "notFlagged" };
  }

  if (body.isArchived !== undefined) {
    dbUpdate.isArchived = body.isArchived;
  }

  if (Object.keys(dbUpdate).length > 0) {
    await db
      .update(outlookEmails)
      .set(dbUpdate)
      .where(eq(outlookEmails.id, numericId));
  }

  // Sync status changes to Graph (best effort)
  const graphFields = { ...graphUpdate };
  delete graphFields.flag; // handle separately
  const graphPatch = Object.keys(graphFields).length > 0 ? graphFields : null;

  try {
    const token = await getFreshOutlookAccessToken(user.id);
    if (token) {
      if (graphPatch) {
        await axios.patch(
          `${GRAPH_BASE}/me/messages/${email.outlookId}`,
          graphPatch,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      if (graphUpdate.flag) {
        await axios.patch(
          `${GRAPH_BASE}/me/messages/${email.outlookId}`,
          { flag: graphUpdate.flag },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      // Move to Archive folder if archiving
      if (body.isArchived === true) {
        await axios.post(
          `${GRAPH_BASE}/me/messages/${email.outlookId}/move`,
          { destinationId: "archive" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    }
  } catch (err) {
    console.error("[outlook/messages PATCH] Graph sync failed:", err);
    // DB update already succeeded; Graph sync failure is non-fatal
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(outlookEmails)
    .where(and(eq(outlookEmails.id, numericId), eq(outlookEmails.userId, user.id)))
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .delete(outlookEmails)
    .where(eq(outlookEmails.id, numericId));

  // Delete from Graph (best effort)
  try {
    const token = await getFreshOutlookAccessToken(user.id);
    if (token) {
      await axios.delete(
        `${GRAPH_BASE}/me/messages/${rows[0].outlookId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  } catch (err) {
    console.error("[outlook/messages DELETE] Graph delete failed:", err);
  }

  return NextResponse.json({ success: true });
}
