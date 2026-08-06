import {
  downloadPortalFile,
  getPortalAvailability,
  getPortalMainData,
} from "@/lib/portal/portal_page";
import { portalMainDrizzle } from "@db/classes/portal_main_db";
import { portalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import { documentRequestsDrizzle } from "@db/classes/document_requests_db";
import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/util/validation";
import { getPortalChatMessages } from "@/lib/portal/portal_chat";
import { portalChatDrizzle } from "@db/classes/portal_chat_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

export async function mainType(token: string) {
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

export async function availabilityType(
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

export async function chatType(token: string) {
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

export async function downloadFilesType(token: string, id: string) {
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
