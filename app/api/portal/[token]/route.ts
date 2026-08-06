import { NextRequest, NextResponse } from "next/server";
import {
  availabilityType,
  chatType,
  downloadFilesType,
  mainType,
} from "@/lib/portal/portal_token_route";

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
