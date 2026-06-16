import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  cases,
  clients,
  clientPortalTokens,
  tasks,
  outlookEmails,
} from "@db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/auth";

const mainType = async (clientId: number, userId: string) => {
  try {
    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        status: clients.status,
        notes: clients.notes,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        totalCases: sql<number>`COUNT(${cases.id})::int`,
        completedCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'completed' THEN 1 END)::int`,
        activeCases: sql<number>`COUNT(CASE WHEN ${cases.status} = 'active' THEN 1 END)::int`,
      })
      .from(clients)
      .leftJoin(cases, eq(cases.clientId, clients.id))
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .groupBy(clients.id)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const portalRows = await db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, userId)
        )
      )
      .limit(1);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const portal = portalRows[0]
      ? {
          ...portalRows[0],
          portalUrl: `${appUrl}/portal/${portalRows[0].token}`,
        }
      : null;

    return NextResponse.json({ client: rows[0], portal });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

const caseType = async (clientId: number, userId: string) => {
  try {
    const caseRows = await db
      .select({
        id: cases.id,
        name: cases.name,
        description: cases.description,
        status: cases.status,
        dueDate: cases.dueDate,
        priority: cases.priority,
        clientId: cases.clientId,
        userId: cases.userId,
        clientName: clients.name,
        totalTasks: sql<number>`COUNT(${tasks.id})::int`,
        completedTasks: sql<number>`COALESCE(SUM(CASE WHEN ${tasks.completed} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(cases)
      .leftJoin(clients, eq(cases.clientId, clients.id))
      .leftJoin(tasks, eq(tasks.caseId, cases.id))
      .where(and(eq(cases.clientId, clientId), eq(cases.userId, userId)))
      .groupBy(cases.id, clients.name);

    const casesWithStats = caseRows.map((c) => {
      const totalTasks = c.totalTasks;
      const completedTasks = c.completedTasks;
      const percentage =
        totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        dueDate: c.dueDate,
        priority: c.priority,
        clientId: c.clientId,
        userId: c.userId,
        clientName: c.clientName,
        stats: { totalTasks, completedTasks, percentage },
      };
    });

    return NextResponse.json({ cases: casesWithStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

const outlookEmailsType = async (clientId: number, userId: string) => {
  try {
    const rows = await db
      .select({
        id: outlookEmails.id,
        subject: outlookEmails.subject,
        snippet: outlookEmails.snippet,
        fromEmail: outlookEmails.fromEmail,
        fromName: outlookEmails.fromName,
        toEmails: outlookEmails.toEmails,
        isRead: outlookEmails.isRead,
        isSent: outlookEmails.isSent,
        hasAttachments: outlookEmails.hasAttachments,
        sentAt: outlookEmails.sentAt,
      })
      .from(outlookEmails)
      .where(
        and(
          eq(outlookEmails.clientId, clientId),
          eq(outlookEmails.userId, userId)
        )
      )
      .orderBy(desc(outlookEmails.sentAt))
      .limit(50);

    return NextResponse.json({ emails: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

const portalType = async (clientId: number, userId: string) => {
  try {
    const rows = await db
      .select({
        id: clientPortalTokens.id,
        clientId: clientPortalTokens.clientId,
        token: clientPortalTokens.token,
        enabled: clientPortalTokens.enabled,
        settings: clientPortalTokens.settings,
        lastAccessedAt: clientPortalTokens.lastAccessedAt,
        createdAt: clientPortalTokens.createdAt,
        clientName: clients.name,
        clientEmail: clients.email,
      })
      .from(clientPortalTokens)
      .leftJoin(clients, eq(clientPortalTokens.clientId, clients.id))
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, userId)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ portal: null });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const portal = {
      ...rows[0],
      portalUrl: `${appUrl}/portal/${rows[0].token}`,
    };

    return NextResponse.json({ portal });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const searchParams = _req.nextUrl.searchParams;
  const type = searchParams.get("type");

  const user = await getCurrentUser();
  if (!user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const clientId = Number(id);
  if (Number.isNaN(clientId))
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });

  if (type === "main") return await mainType(clientId, user.id);
  if (type === "cases") return await caseType(clientId, user.id);
  if (type === "outlook-emails")
    return await outlookEmailsType(clientId, user.id);
  if (type == "portal") return await portalType(clientId, user.id);

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
