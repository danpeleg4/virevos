import { NextResponse } from "next/server";
import { db } from "@db/db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [meeting] = await db.select().from(events).where(eq(events.id, id));
  if (!meeting) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(meeting);
}
