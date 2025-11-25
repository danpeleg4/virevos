import { NextResponse } from "next/server";
import { currentUser, auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { users, meetings, meetingAttendees, events } from "@/db/schema";
import { eq } from "drizzle-orm";

type AttendeeInput = {
    name: string;
    initials: string;
};

type MeetingInput = {
    id: string;
    title: string;
    time: string;
    description: string,
    duration: number;
    type: string;
    status: string;
    hasNotes: boolean;
    hasTranscript: boolean;
    autoRescheduled: boolean;
    conflictReason?: string | null;
    userId: string;
    attendees?: AttendeeInput[];
};

export async function GET() {
    const { isAuthenticated } = await auth();
    if (!isAuthenticated) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].id.toString();

    // Fetch meetings + attendees
    const rows = await db.query.meetings.findMany({
        where: eq(meetings.userId, internalUserId),
        with: {
            attendees: true,
        },
    });

    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const body: MeetingInput & { date: string } = await req.json();

    const { isAuthenticated } = await auth();
    if (!isAuthenticated) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // Lookup internal DB user
    const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.user_id, user.id))
        .limit(1);

    if (dbUser.length === 0) {
        return new NextResponse("User not found", { status: 404 });
    }

    const internalUserId = dbUser[0].id.toString();

    // Insert meeting
    const inserted = await db
        .insert(meetings)
        .values({
            id: body.id,
            title: body.title,
            description: body.description,
            date: new Date(body.date).toISOString(),
            time: body.time,
            duration: body.duration,
            type: body.type,
            status: body.status,
            hasNotes: body.hasNotes ?? false,
            hasTranscript: body.hasTranscript ?? false,
            autoRescheduled: body.autoRescheduled ?? false,
            conflictReason: body.conflictReason ?? null,
            userId: internalUserId
        })
        .returning();

    // Insert attendees
    if (body.attendees?.length) {
        await db.insert(meetingAttendees).values(
            body.attendees.map((a) => ({
                meetingId: body.id,
                name: a.name,
                initials: a.initials,
            }))
        );
    }

    return NextResponse.json(inserted[0]);
}
