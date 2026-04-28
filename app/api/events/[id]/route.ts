import { NextResponse } from "next/server";
import { db } from "@db/db";
import { events } from "@db/schema";
import { eq } from "drizzle-orm";
import {currentUser} from "@clerk/nextjs/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await currentUser();
  const [meeting] = await db.select().from(events).where(eq(events.id, id));
  if (!meeting) return new NextResponse("Not found", { status: 404 });
  const isHost = !!user && user.id === meeting.userId;
  return NextResponse.json({ meeting, isHost });
}
