import { NextRequest, NextResponse } from "next/server";
import {
  getPortalAvailability,
  getPortalMainData,
  downloadPortalFile,
} from "@/lib/portal/portal_page";
import { getPortalChatMessages } from "@/lib/portal/portal_chat";
import { portalMainDrizzle } from "@db/classes/portal_main_db";
import { portalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import { portalChatDrizzle } from "@db/classes/portal_chat_db";
import { documentRequestsDrizzle } from "@db/classes/document_requests_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

async function mainType(token: string) {
  try {
    const result = await getPortalMainData(
      token,
      portalMainDrizzle,
      portalBookingsDrizzle,
      documentRequestsDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal/[token] GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function availabilityType(
  token: string,
  dateParam: string,
  durationParam: string
) {
  try {
    const result = await getPortalAvailability(
      token,
      dateParam,
      durationParam,
      portalMainDrizzle,
      portalBookingsDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal/[token]/availability GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function chatType(token: string) {
  try {
    const result = await getPortalChatMessages(token, portalChatDrizzle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal/[token]/chat GET]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function downloadFilesType(token: string, id: string) {
  const fileId = Number(id);
  try {
    const { bytes, fileName, mimeType } = await downloadPortalFile(
      token,
      fileId,
      portalMainDrizzle,
      supabaseStorageClient
    );

    const asciiFallback = fileName
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_");

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": bytes.byteLength.toString(),
      },
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return new NextResponse(err.message, { status: err.status });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const searchParams = _req.nextUrl.searchParams;
  const type = searchParams.get("type");
  const dateParam = searchParams.get("date"); // "YYYY-MM-DD"
  const durationParam = searchParams.get("duration");
  const fileId = searchParams.get("fileId");

  if (type == "main") return await mainType(token);
  if (type == "availability" && dateParam && durationParam)
    return await availabilityType(token, dateParam, durationParam);
  if (type == "chat") return await chatType(token);
  if (type == "filesDownload" && fileId)
    return await downloadFilesType(token, fileId);

  return NextResponse.json({ error: "No type found" });
}
