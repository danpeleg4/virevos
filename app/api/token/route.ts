import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {createRoom} from "@/lib/server_actions/meetings";
import {currentUser} from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    const user = await currentUser();
    const { roomId, name } = await req.json();

    const participantName = name || `user-${Math.floor(Math.random() * 1000)}`;
    if (!participantName) {
        return NextResponse.json({ error: "identity (name) is required" }, { status: 400 });
    }

    await createRoom(roomId, user?.id);

    // Create the token
    const at = new AccessToken(
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
        {
            identity: participantName,
            ttl: 600, // 10 minutes
        }
    );

    at.addGrant({ roomJoin: true, room: roomId });

    const token = await at.toJwt();

    //console.log("issuing token:", token, "for room:", roomId, "identity:", participantName);

    return NextResponse.json({
        token,
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
}
