import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const { roomId } = await params;

    // Get the participant name from query params
    const urlObj = new URL(req.url);
    const participantName = urlObj.searchParams.get("name") || `user-${Math.floor(Math.random() * 1000)}`;
    console.log(`participantName: ${participantName}`);
    if (!participantName) {
        return NextResponse.json({ error: "identity (name) is required" }, { status: 400 });
    }

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

    console.log("issuing token:", token, "for room:", roomId, "identity:", participantName);

    return NextResponse.json({
        token,
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
}
