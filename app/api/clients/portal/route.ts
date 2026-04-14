import { NextResponse } from "next/server";
import { db } from "@db/db";
import { clients, clientPortalTokens } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
      })
      .from(clients)
      .innerJoin(
        clientPortalTokens,
        and(
          eq(clientPortalTokens.clientId, clients.id),
          eq(clientPortalTokens.enabled, true)
        )
      )
      .where(and(eq(clients.userId, user.id), eq(clients.status, "active")));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[api/clients/portal GET]", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
