import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { clients } from "@/db/schema";

export async function GET() {
    try {
        const result = await db.select().from(clients).orderBy(clients.id);
        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, phone } = body;

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
            })
            .returning();

        return NextResponse.json(created[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
