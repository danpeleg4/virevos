import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteCaseFile,
  downloadCaseFile,
  getCaseFiles,
} from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const fileId = Number(id);

  if (Number.isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
  }

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");

  try {
    if (type == "download") {
      let file;
      try {
        file = await downloadCaseFile(
          fileId,
          casesDrizzle,
          supabaseStorageClient
        );
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        return new NextResponse("Download failed", { status: 500 });
      }
      if (!file) return new NextResponse("Not found", { status: 404 });

      const asciiFallback = file.name
        .replace(/[^\x20-\x7E]/g, "_")
        .replace(/["\\]/g, "_");
      const utf8Encoded = encodeURIComponent(file.name);

      return new NextResponse(Buffer.from(file.body), {
        headers: {
          "Content-Type": file.mimeType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
          "Content-Length": file.body.byteLength.toString(),
        },
      });
    }

    if (type == "get-files") {
      // the id param is the case id for this type
      const files = await getCaseFiles(fileId, casesDrizzle);
      return NextResponse.json(files);
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/files/[id] GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const fileId = Number(id);
    if (Number.isNaN(fileId)) {
      return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
    }

    await deleteCaseFile(fileId, casesDrizzle, supabaseStorageClient);
    return NextResponse.json({ success: true, id: fileId });
  } catch (err) {
    console.error("[api/files/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Failed to delete file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
