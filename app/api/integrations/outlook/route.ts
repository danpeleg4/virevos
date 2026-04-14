import { NextResponse } from "next/server";
import { db } from "@db/db";
import { outlookEmails, outlookTokens } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { removeSubscriptions } from "@/lib/outlook_sync";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select()
    .from(outlookTokens)
    .where(eq(outlookTokens.userId, user.id))
    .limit(1);

  return NextResponse.json({
    connected: rows.length > 0 && rows[0].connected === true,
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const data = await req.json();

  if (data.action === "disconnect") {
    try {
      await removeSubscriptions(user.id);
    } catch (err) {
      console.error("[integrations/outlook] removeSubscriptions failed:", err);
    }

    await db.delete(outlookTokens).where(eq(outlookTokens.userId, user.id));
    await db.delete(outlookEmails).where(eq(outlookEmails.userId, user.id));

    return NextResponse.json({ success: true });
  }

  if (data.action === "status") {
    const rows = await db
      .select()
      .from(outlookTokens)
      .where(eq(outlookTokens.userId, user.id))
      .limit(1);

    return NextResponse.json({
      connected: rows.length > 0 && rows[0].connected,
    });
  }

  return new NextResponse("Method not allowed", { status: 405 });
}
