import { NextResponse } from "next/server";
import { db } from "@/db/db";
import {clients, projects} from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import {and, eq, sql} from "drizzle-orm";

export async function GET() {
    try {
        const user = await currentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const result = await db
            .select({
                clientId: clients.id,
                name: clients.name,
                email: clients.email,
                phone: clients.phone,
                industry: clients.industry,
                status: clients.status,
                notes: clients.notes,
                createdAt: clients.createdAt,
                updatedAt: clients.updatedAt,


                totalProjects: sql<number>`
                    COUNT(${projects.id})
                `,

                completedProjects: sql<number>`
      COUNT(CASE WHEN ${projects.status} = 'completed' THEN 1 END)
    `,

                activeProjects: sql<number>`
      COUNT(CASE WHEN ${projects.status} = 'in-progress' THEN 1 END)
    `,
            })
            .from(clients)
            .leftJoin(
                projects,
                eq(projects.clientId, clients.id),
            )
            .where(eq(clients.userId, user.id))
            .groupBy(clients.id);

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        const body = await req.json();
        const { name, email, phone, industry } = body;

        if (!name || !email) {
            return NextResponse.json({ message: "Name & email required" }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ message: "Invalid email format" }, { status: 400 });
        }

        const created = await db
            .insert(clients)
            .values({
                name,
                email,
                phone: phone ? phone : null,
                industry: industry ? industry : null,
                status: "active",
                notes: "",
                userId: user.id
            })
            .returning();

        return NextResponse.json(created[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
