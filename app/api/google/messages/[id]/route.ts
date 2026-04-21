import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { googleEmails } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { getGmailClient } from "@/lib/gmail_client";

type ActionType =
  | "star"
  | "unstar"
  | "archive"
  | "unarchive"
  | "markRead"
  | "markUnread"
  | "trash";

const labelActions: Record<
  ActionType,
  { addLabels?: string[]; removeLabels?: string[] }
> = {
  star: { addLabels: ["STARRED"] },
  unstar: { removeLabels: ["STARRED"] },
  archive: { removeLabels: ["INBOX"] },
  unarchive: { addLabels: ["INBOX"] },
  markRead: { removeLabels: ["UNREAD"] },
  markUnread: { addLabels: ["UNREAD"] },
  trash: { addLabels: ["TRASH"], removeLabels: ["INBOX"] },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action as ActionType;

    if (!action || !labelActions[action]) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find email in DB
    const emailRow = await db
      .select()
      .from(googleEmails)
      .where(
        and(
          eq(googleEmails.id, parseInt(id, 10)),
          eq(googleEmails.userId, user.id)
        )
      )
      .limit(1);

    if (!emailRow.length) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const email = emailRow[0];

    // Apply to Gmail
    const gmail = await getGmailClient(user.id);
    if (gmail && email.gmailId) {
      try {
        const ops = labelActions[action];
        await gmail.users.messages.modify({
          userId: "me",
          id: email.gmailId,
          requestBody: {
            addLabelIds: ops.addLabels ?? [],
            removeLabelIds: ops.removeLabels ?? [],
          },
        });
      } catch (gmailErr) {
        console.error("[gmail messages PATCH] Gmail modify error:", gmailErr);
        // Continue even if Gmail fails
      }
    }

    // Update DB
    const dbUpdate: Partial<typeof email> = {};
    if (action === "star") dbUpdate.isStarred = true;
    if (action === "unstar") dbUpdate.isStarred = false;
    if (action === "archive") dbUpdate.isArchived = true;
    if (action === "unarchive") dbUpdate.isArchived = false;
    if (action === "markRead") dbUpdate.isRead = true;
    if (action === "markUnread") dbUpdate.isRead = false;

    if (Object.keys(dbUpdate).length > 0) {
      await db
        .update(googleEmails)
        .set(dbUpdate)
        .where(eq(googleEmails.id, email.id));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/gmail/messages/[id] PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(googleEmails)
      .where(
        and(
          eq(googleEmails.id, parseInt(id, 10)),
          eq(googleEmails.userId, user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/gmail/messages/[id] DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
