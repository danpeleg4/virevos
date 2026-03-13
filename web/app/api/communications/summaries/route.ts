import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { conversationSummaries, clients } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { generateClientSummary } from "@/lib/ai_summarize";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: conversationSummaries.id,
        clientId: conversationSummaries.clientId,
        summary: conversationSummaries.summary,
        keyTopics: conversationSummaries.keyTopics,
        actionItems: conversationSummaries.actionItems,
        sentiment: conversationSummaries.sentiment,
        emailCount: conversationSummaries.emailCount,
        generatedAt: conversationSummaries.generatedAt,
        clientName: clients.name,
        clientEmail: clients.email,
      })
      .from(conversationSummaries)
      .leftJoin(clients, eq(conversationSummaries.clientId, clients.id))
      .where(eq(conversationSummaries.userId, user.id));

    return NextResponse.json({ summaries: rows });
  } catch (err) {
    console.error("[api/communications/summaries GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch summaries" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    // Verify client belongs to user
    const clientRows = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const result = await generateClientSummary(user.id, clientId);

    // Upsert: one summary per client per user
    const existing = await db
      .select({ id: conversationSummaries.id })
      .from(conversationSummaries)
      .where(
        and(
          eq(conversationSummaries.clientId, clientId),
          eq(conversationSummaries.userId, user.id)
        )
      )
      .limit(1);

    let summary;
    if (existing.length > 0) {
      const [updated] = await db
        .update(conversationSummaries)
        .set({
          summary: result.summary,
          keyTopics: result.keyTopics,
          actionItems: result.actionItems,
          sentiment: result.sentiment,
          emailCount: result.emailCount,
          generatedAt: new Date(),
        })
        .where(eq(conversationSummaries.id, existing[0].id))
        .returning();
      summary = updated;
    } else {
      const [inserted] = await db
        .insert(conversationSummaries)
        .values({
          clientId,
          summary: result.summary,
          keyTopics: result.keyTopics,
          actionItems: result.actionItems,
          sentiment: result.sentiment,
          emailCount: result.emailCount,
          userId: user.id,
        })
        .returning();
      summary = inserted;
    }

    return NextResponse.json({
      summary: { ...summary, clientName: clientRows[0].name },
    });
  } catch (err) {
    console.error("[api/communications/summaries POST]", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    await db
      .delete(conversationSummaries)
      .where(
        and(
          eq(conversationSummaries.clientId, clientId),
          eq(conversationSummaries.userId, user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/communications/summaries DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete summary" },
      { status: 500 }
    );
  }
}
