import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const { name, email, phone } = body;

    if (!name || !email) {
        return NextResponse.json(
            { message: "Name and email are required" },
            { status: 400 }
        );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return NextResponse.json(
            { message: "Invalid email format" },
            { status: 400 }
        );
    }

    // Here you would insert into DB (Prisma/Mongo/etc.)
    return NextResponse.json({
        message: "Client added successfully",
        data: { name, email, phone },
    });
}
