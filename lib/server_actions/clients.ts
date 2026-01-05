"use server"

import {CreateClientInput} from "@/types/clients";
import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {db} from "@/db/db";
import {clients} from "@/db/schema";
import {and, eq} from "drizzle-orm";

export async function addAClient(body: CreateClientInput) {
    try {
        const user = await currentUser();
        if (!user?.id) throw new Error("No user");
        const { name, email, phone, industry, notes } = body;

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
                notes: notes,
                userId: user.id
            })
            .returning();

        return created[0]
    } catch (error) {
        console.error(error);
        return { message: "Server error" }
    }
}

export async function deleteClient({id}: { id: number; }) {
    const user = await currentUser();
    if (!user?.id) throw new Error("No user");
    await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, user.id)));
}

export async function updateNotes(id: number, notes: string) {
    await db.update(clients).set({notes: notes}).where(and(eq(clients.id, id)));
}