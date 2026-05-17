"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { clientPortalTokens, clients } from "@db/schema";
import { and, eq, InferSelectModel } from "drizzle-orm";
import { ValidationError, requireInt } from "./util/validation";

type DbPortalSettings = NonNullable<
  InferSelectModel<typeof clientPortalTokens>["settings"]
>;

export type PortalSettings = DbPortalSettings;

export interface SavePortalSettingsInput {
  clientId: number;
  settings?: PortalSettings;
  enabled?: boolean;
}

export async function savePortalSettings(input: SavePortalSettingsInput) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const clientId = requireInt(input.clientId, "clientId");

  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
    .limit(1);

  if (!clientRows.length) {
    throw new ValidationError("Client not found", 404);
  }

  const existing = await db
    .select()
    .from(clientPortalTokens)
    .where(
      and(
        eq(clientPortalTokens.clientId, clientId),
        eq(clientPortalTokens.userId, user.id)
      )
    )
    .limit(1);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  let record;
  if (existing.length > 0) {
    const updateData: { settings?: PortalSettings; enabled?: boolean } = {};
    if (input.settings !== undefined) updateData.settings = input.settings;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;

    const [updated] = await db
      .update(clientPortalTokens)
      .set(updateData)
      .where(eq(clientPortalTokens.id, existing[0].id))
      .returning();
    record = updated;
  } else {
    const token = crypto.randomUUID();
    const [inserted] = await db
      .insert(clientPortalTokens)
      .values({
        clientId,
        token,
        enabled: input.enabled ?? true,
        settings: input.settings || {},
        userId: user.id,
      })
      .returning();
    record = inserted;
  }

  return {
    ...record,
    portalUrl: `${appUrl}/portal/${record.token}`,
    clientName: clientRows[0].name,
  };
}
