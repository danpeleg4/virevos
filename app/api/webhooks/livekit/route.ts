import { NextRequest, NextResponse } from "next/server";
import {db} from "@/db/db";
import {meetingAttendees, meetings} from "@/db/schema";
import {eq} from "drizzle-orm";

interface LiveKitRoom {
    sid: string;
    name: string;
    empty_at: string;
    creationTime: number;
}

interface LiveKitRoomFinishedEvent {
    event: "room.finished";
    version: string;
    room: LiveKitRoom;
    timestamp: string;
}

export async function POST(req: NextRequest) {
    // Parse JSON body
    const event = await req.json();
    console.log("Received event:", event);
    if (event.event === "room_finished" || event.event === "room.finished") {
    const res = await db.select().from(meetings).where(eq(meetings.id, event.room.sid))
        if (res.length > 0) {
            const finishedAt = new Date(event.timestamp).getTime();
            const createdAt = event.room.creationTime * 1000;
            const durationInMinutes = Math.round((finishedAt - createdAt) / 60000);

            await db.update(meetings).set({
                duration: durationInMinutes,
                status: "ended"
            }).where(eq(meetings.id, res[0].id));
        }
    }
    if (event.event === "participant_joined") {
        await db.insert(meetingAttendees).values({
            meetingId: event.room.sid,
            name: event.participant.identity,
            initials: event.participant.identity.split(" ")[0]
        })
    }

    return NextResponse.json({ status: "ok" });
}
