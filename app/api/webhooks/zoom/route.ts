import crypto from "crypto";
import { NextResponse } from "next/server";
import {meetingAttendees, meetings} from "@/db/schema";
import { db } from "@/db/db";
import {eq} from "drizzle-orm";

function verifyZoomSignature(req: Request, body: string) {
    const secretToken = process.env.ZOOM_SECRET_TOKEN;
    if (!secretToken) return true; // ← allow all during dev

    const ts = req.headers.get("x-zm-request-timestamp");
    const signature = req.headers.get("x-zm-signature");

    if (!ts || !signature) return false;

    const message = `v0:${ts}:${body}`;
    const hashForVerify = crypto
        .createHmac("sha256", secretToken)
        .update(message)
        .digest("hex");

    return signature === `v0=${hashForVerify}`;
}

export async function POST(req: Request) {
    const raw = await req.text();
    const json = JSON.parse(raw);

    // URL validation
    if (json.event === "endpoint.url_validation") {
        const token = json.payload?.plainToken;
        const encryptedToken = crypto
            .createHmac("sha256", process.env.ZOOM_SECRET_TOKEN!)
            .update(token)
            .digest("hex");

        return NextResponse.json({ plainToken: token, encryptedToken });
    }

    // Signature verification (dev-safe)
    if (!verifyZoomSignature(req, raw)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("Zoom event:", json.event);
    console.log("Payload:", JSON.stringify(json, null, 2));

    // Meeting participant joined
    if (json.event === "meeting.participant_joined") {
        const participant = json.payload?.object?.participant;
        const meetingId = json.payload?.object?.id;

        if (participant && meetingId) {
            const zoomId = json.payload.object.id;

            const meeting = await db.query.meetings.findFirst({
                where: eq(meetings.id, zoomId)
            });

            if (!meeting) {
                console.warn("No meeting found for Zoom meeting ID:", zoomId);
                return NextResponse.json({ ok: true });
            }

            await db.insert(meetingAttendees).values({
                meetingId: meeting.id,
                name: participant.user_name,
                initials: participant.user_name.slice(0, 2).toUpperCase(),
            });

        }
    }

    else if (json.event === "recording.transcript_completed") {
        const meetingId = json.payload.meeting_id;
        const file = json.payload.object.recording_files.find(
            (f: { file_type: string; }) => f.file_type === "TRANSCRIPT"
        );

        if (!file) return new NextResponse("No transcript", {status: 200});
        console.log("Transcript:", file.download_url);
        //await processTranscript(meetingId, file.download_url)
    }


    return NextResponse.json({ received: true });
}
