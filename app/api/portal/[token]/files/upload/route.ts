import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/db";
import {
  clientPortalTokens,
  clients,
  cases,
  caseFiles,
  users,
} from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { uploadFile, deleteFile } from "@/lib/storage";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { rateLimit } from "@/lib/util/rate_limit";
import { assertCanAddFile } from "@/lib/plan_limits";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;
const MAX_MIMETYPE_LENGTH = 100;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimit(req, {
    keyPrefix: "portal-upload",
    windowMs: 60_000,
    max: 10,
  });
  if (limited) return limited;

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
    const caseIdRaw = formData.get("caseId");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    if (!file.name || file.name.length > MAX_FILENAME_LENGTH) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    if (file.type && file.type.length > MAX_MIMETYPE_LENGTH) {
      return NextResponse.json({ error: "Invalid mime type" }, { status: 400 });
    }

    await assertCanAddFile(userId, file.size);

    // Resolve caseId
    let caseId: number;

    if (caseIdRaw) {
      const parsedId = parseInt(String(caseIdRaw), 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ error: "Invalid caseId" }, { status: 400 });
      }
      // Verify the case belongs to this client
      const caseRows = await db
        .select({ id: cases.id })
        .from(cases)
        .where(
          and(eq(cases.id, parsedId), eq(cases.clientId, portalToken.clientId))
        )
        .limit(1);

      if (!caseRows.length) {
        return NextResponse.json(
          { error: "Case not found or does not belong to this client" },
          { status: 403 }
        );
      }
      caseId = parsedId;
    } else {
      // Use first case for this client
      const clientCases = await db
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.clientId, portalToken.clientId))
        .limit(1);

      if (!clientCases.length) {
        return NextResponse.json(
          { error: "No cases found for this client" },
          { status: 400 }
        );
      }
      caseId = clientCases[0].id;
    }

    // Sanitize filename and build storage path
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `cases/${userId}/portal/${Date.now()}-${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(FILES_BUCKET, filePath, fileBuffer, file.type);

    let inserted;
    try {
      inserted = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(caseFiles)
          .values({
            caseId,
            userId,
            name: file.name,
            path: filePath,
            size: file.size,
            mimeType: file.type,
          })
          .returning();
        await tx
          .update(users)
          .set({ storage: sql`${users.storage} + ${file.size}` })
          .where(eq(users.userId, userId));
        return row;
      });
    } catch (dbErr) {
      // Best-effort cleanup so we don't leak orphaned files in storage.
      try {
        await deleteFile(FILES_BUCKET, filePath);
      } catch (cleanupErr) {
        console.error("Orphan file cleanup failed:", cleanupErr);
      }
      console.error("[api/portal/[token]/files/upload POST]", dbErr);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: inserted.id,
        name: inserted.name,
        size: inserted.size,
        mimeType: inserted.mimeType,
        path: inserted.path,
        createdAt: inserted.createdAt,
        caseId,
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
