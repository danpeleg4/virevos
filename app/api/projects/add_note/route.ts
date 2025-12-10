import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {db} from "@/db/db";
import {notes} from "@/db/schema";

export async function POST(req: Request){
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { newNote, projectId } = await req.json();
        const inserted = await db
            .insert(notes)
            .values({
                content: newNote,
                userId: user.id,
                projectId,
            })
            .returning();

        return NextResponse.json(inserted[0]);
    } catch (error) {
        console.error("Error creating note:", error);
        return new NextResponse("Error", { status: 500 });
    }
}
