import { getCurrentUser } from "@/lib/supabase/auth";
import type { PortalDB, PortalSettingsData } from "@db/portal_db";
import { ValidationError, requireInt } from "./util/validation";

export type PortalSettings = PortalSettingsData;

export interface SavePortalSettingsInput {
  clientId: number;
  settings?: PortalSettings;
  enabled?: boolean;
}

export async function savePortalSettings(
  input: SavePortalSettingsInput,
  portalDb: PortalDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const clientId = requireInt(input.clientId, "clientId");

  const clientRows = await portalDb.getClientOwnedByUser(clientId, user.id);

  if (!clientRows.length) {
    throw new ValidationError("Client not found", 404);
  }

  const existing = await portalDb.getPortalTokenByClient(clientId, user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  let record;
  if (existing.length > 0) {
    const updateData: { settings?: PortalSettings; enabled?: boolean } = {};
    if (input.settings !== undefined) updateData.settings = input.settings;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;

    record = await portalDb.updatePortalToken(existing[0].id, updateData);
  } else {
    const token = crypto.randomUUID();
    record = await portalDb.insertPortalToken({
      clientId,
      token,
      enabled: input.enabled ?? true,
      settings: input.settings || {},
      userId: user.id,
    });
  }

  return {
    ...record,
    portalUrl: `${appUrl}/portal/${record.token}`,
    clientName: clientRows[0].name,
  };
}
