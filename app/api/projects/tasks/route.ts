import {currentUser} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {db} from "@/db/db";

export async function GET() {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const tasks = await db.query.tasks.findMany({
        where: (fields, { eq, and }) => eq(fields.user_id, user.id),
    });
}