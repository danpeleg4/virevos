import { db } from "@/db/db";
import { users } from "@/db/schema";
import { verifyWebhook } from "@clerk/backend/webhooks";

/**
* This webhook will be called when a new user is created in Clerk
*/

export async function POST(req: Request) {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created") {
        const { id, email_addresses, first_name, last_name } = evt.data;
        console.log(evt.data);
        await db.insert(users).values({
            user_id: id,
            email: email_addresses[0]?.email_address || "",
            name: `${first_name || ""} ${last_name || ""}`.trim(),
        });
    }

    return new Response("ok");
}