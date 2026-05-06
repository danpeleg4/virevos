import { NextResponse } from "next/server";
import { db } from "@db/db";
import { googleTokens } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select()
    .from(googleTokens)
    .where(eq(googleTokens.userId, user.id))
    .limit(1);

  return NextResponse.json({
    connected: rows.length > 0 && rows[0].connected === true,
  });
}
