import { NextRequest, NextResponse } from "next/server";
import {db} from "@/db/db";
import {meetings} from "@/db/schema";
import {eq} from "drizzle-orm";

interface LiveKitRoom {
    sid: string;
    name: string;
    empty_at: string;
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
    if(event.event === "room_started"){
        //await db.update(meetings).set({roomId: event.room.sid}).where(eq(meetings.roomId, event.room.sid));
        //console.log(event);
    }
    if (event.event === "participant_joined") {
        console.log("participant_joined", event.room.name, event.room.sid);
        //await db.insert(meetings).values({
        //    roomId: event.room.sid,
        //    name: event.participant.identity,
        //})
        // Perform cleanup or processing here
    }

    return NextResponse.json({ status: "ok" });
}
