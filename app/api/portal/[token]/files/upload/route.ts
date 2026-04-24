import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  clients,
  projects,
  projectFiles,
} from "@db/schema";
import { and, eq } from "drizzle-orm";
import { uploadFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token
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
    const settings = portalToken.settings as {
      fileSharing?: boolean;
    } | null;

    // Respect fileSharing setting (default enabled)
    if (settings?.fileSharing === false) {
      return NextResponse.json(
        { error: "File sharing is not enabled for this portal" },
        { status: 403 }
      );
    }

    const userId = portalToken.userId;

    // Fetch client
    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.id, portalToken.clientId))
      .limit(1);

    if (!clientRows.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectIdRaw = formData.get("projectId");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    // Resolve projectId
    let projectId: number;

    if (projectIdRaw) {
      const parsedId = parseInt(String(projectIdRaw), 10);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { error: "Invalid projectId" },
          { status: 400 }
        );
      }
      // Verify the project belongs to this client
      const projectRows = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsedId),
            eq(projects.clientId, portalToken.clientId)
          )
        )
        .limit(1);

      if (!projectRows.length) {
        return NextResponse.json(
          { error: "Project not found or does not belong to this client" },
          { status: 403 }
        );
      }
      projectId = parsedId;
    } else {
      // Use first project for this client
      const clientProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.clientId, portalToken.clientId))
        .limit(1);

      if (!clientProjects.length) {
        return NextResponse.json(
          { error: "No projects found for this client" },
          { status: 400 }
        );
      }
      projectId = clientProjects[0].id;
    }

    // Sanitize filename and build storage path
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `projects/${userId}/portal/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);

    // Insert metadata
    const [inserted] = await db
      .insert(projectFiles)
      .values({
        projectId,
        userId,
        name: file.name,
        path: filePath,
        size: file.size,
        mimeType: file.type,
      })
      .returning();

    return NextResponse.json(
      {
        id: inserted.id,
        name: inserted.name,
        size: inserted.size,
        mimeType: inserted.mimeType,
        path: inserted.path,
        createdAt: inserted.createdAt,
        projectId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/portal/[token]/files/upload POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
