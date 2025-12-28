import { db } from "@/db/db";
import {meetingTypes, users} from "@/db/schema";
import { verifyWebhook } from "@clerk/backend/webhooks";
import {map} from "d3-array";

/**
* This webhook will be called when a new user is created in Clerk
*/

interface MeetingType {
    id: string;
    name: string;
    duration: number;
    description: string;
    color: string;
    platform: "zoom" | "google-meet" | "In-Person";
    bookingLink?: string;
    active: boolean;
    maxPerDay?: number;
}

const mockMeetingTypes: MeetingType[] = [
    {
        id: "1",
        name: "Zoom",
        duration: 30,
        description: "Initial consultation to understand client needs and explore how Virevos can help",
        color: "blue",
        platform: "zoom",
        bookingLink: "Virevos.com/book/discovery-call",
        active: true,
        maxPerDay: 3,
    },
    {
        id: "2",
        name: "Google Meet",
        duration: 30,
        description: "Comprehensive onboarding session for new clients",
        color: "green",
        platform: "google-meet",
        bookingLink: "Virevos.com/book/onboarding",
        active: true,
        maxPerDay: 3,
    },
    {
        id: "3",
        name: "In-Person",
        duration: 30,
        description: "Initial consultation to understand client needs and explore how Virevos can help",
        color: "purple",
        platform: "In-Person",
        active: true,
        maxPerDay: 3,
    }
];

export async function POST(req: Request) {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created") {
        const { id, email_addresses, first_name, last_name } = evt.data;
        //console.log(evt.data);
        await db.insert(users).values({
            user_id: id,
            email: email_addresses[0]?.email_address || "",
            name: `${first_name || ""} ${last_name || ""}`.trim(),
        });

        await db.insert(meetingTypes).values({
            mockMeetingTypes.map(mt => ({...mt, user_id: id}))
        })
    }

    return new Response("ok");
}