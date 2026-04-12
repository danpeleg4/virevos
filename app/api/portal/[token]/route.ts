import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  clients,
  projects,
  googleEmails,
  projectFiles,
} from "@db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find portal token
    const tokenRows = await db
      .select()
      .from(clientPortalTokens)
      .where(eq(clientPortalTokens.token, token))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].enabled) {
      return NextResponse.json(
        { error: "Portal not found or disabled" },
        { status: 404 }
      );
    }

    const portalToken = tokenRows[0];

    // Update last accessed
    await db
      .update(clientPortalTokens)
      .set({ lastAccessedAt: new Date() })
      .where(eq(clientPortalTokens.id, portalToken.id));

    // Fetch client info
    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.id, portalToken.clientId))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRows[0];

    // Fetch client's projects
    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, client.id));

    // Fetch emails involving this client
    const clientEmails = await db
      .select({
        id: googleEmails.id,
        subject: googleEmails.subject,
        snippet: googleEmails.snippet,
        fromEmail: googleEmails.fromEmail,
        fromName: googleEmails.fromName,
        bodyText: googleEmails.bodyText,
        bodyHtml: googleEmails.bodyHtml,
        isSent: googleEmails.isSent,
        sentAt: googleEmails.sentAt,
        isRead: googleEmails.isRead,
      })
      .from(googleEmails)
      .where(
        and(
          eq(googleEmails.userId, portalToken.userId),
          eq(googleEmails.clientId, client.id)
        )
      )
      .limit(50);

    // Fetch project files for client's projects
    const projectIds = clientProjects.map((p) => p.id);
    const files: Array<typeof projectFiles.$inferSelect> = [];
    if (projectIds.length > 0) {
      // Fetch files for all projects (drizzle doesn't support inArray easily without import, use loop)
      for (const pid of projectIds) {
        const pFiles = await db
          .select()
          .from(projectFiles)
          .where(eq(projectFiles.projectId, pid));
        files.push(...pFiles);
      }
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        industry: client.industry,
      },
      settings: portalToken.settings || {},
      projects: clientProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        dueDate: p.dueDate,
        priority: p.priority,
        description: p.description,
      })),
      messages: clientEmails.map((e) => ({
        id: e.id,
        subject: e.subject,
        preview: e.snippet || e.bodyText?.slice(0, 200) || "",
        from: e.fromName || e.fromEmail || "Agency",
        isSent: e.isSent,
        sentAt: e.sentAt,
        isRead: e.isRead,
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        path: f.path,
        createdAt: f.createdAt,
      })),
    });
  } catch (err) {
    console.error("[api/portal/[token] GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
