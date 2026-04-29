import { NextResponse } from "next/server";
import { db } from "@db/db";
import { clients, cases } from "@db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        industry: clients.industry,
        status: clients.status,
        notes: clients.notes,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,

        totalCases: sql<number>`
                    COUNT(${cases.id})
                `,

        completedCases: sql<number>`
      COUNT(CASE WHEN ${cases.status} = 'completed' THEN 1 END)
    `,

        activeCases: sql<number>`
      COUNT(CASE WHEN ${cases.status} = 'active' THEN 1 END)
    `,
      })
      .from(clients)
      .leftJoin(cases, eq(cases.clientId, clients.id))
      .where(eq(clients.userId, user.id))
      .groupBy(clients.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
