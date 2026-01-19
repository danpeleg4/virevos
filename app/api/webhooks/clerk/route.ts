import { db } from "@/db/db";
import {meetingTypes, users} from "@/db/schema";
import { verifyWebhook } from "@clerk/backend/webhooks";

/**
* This webhook will be called when a new user is created in Clerk
*/

interface MeetingTypeInput {
    name: string;
    duration: number;
    description: string;
    color: string;
    active: boolean;
    maxBookings?: number;
}

const initialMeetingTypes: MeetingTypeInput[] = [
    {
        name: "Online Meeting",
        duration: 30,
        description: "Initial consultation to understand client needs and explore how Virevos can help",
        color: "blue",
        active: true,
        maxBookings: 3,
    },
    {
        name: "In-Person",
        duration: 30,
        description: "Initial consultation to understand client needs and explore how Virevos can help",
        color: "purple",
        active: true,
        maxBookings: 3,
    },
];

export async function POST(req: Request) {
    const evt = await verifyWebhook(req);
    if (evt.type === "user.created") {
        const { id, email_addresses, first_name, last_name } = evt.data;
        await db.insert(users).values({
            user_id: id,
            email: email_addresses[0]?.email_address || "",
            name: `${first_name || ""} ${last_name || ""}`.trim(),
        });

        await db.insert(meetingTypes).values(
            initialMeetingTypes.map(mt => ({ ...mt, userId: id }))
        );
    }

    return new Response("ok");
}