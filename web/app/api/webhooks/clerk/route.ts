import { db } from "@db/db";
import { users } from "@db/schema";
import { Webhook } from 'svix';
import { headers } from 'next/headers';

/**
 * This webhook will be called when a new user is created in Clerk
 */

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Missing secret", { status: 500 });
  }

  // 1. Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // 2. Get the RAW text body (Crucial for signature matching)
  const body = await req.text();

  // 3. Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // 4. Extract data from the verified event
  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    await db.insert(users).values({
      user_id: id,
      email: email_addresses[0]?.email_address || "",
      name: `${first_name || ""} ${last_name || ""}`.trim(),
    });
  }

  return new Response("ok", { status: 200 });
}