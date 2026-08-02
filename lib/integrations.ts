import { getCurrentUser } from "@/lib/supabase/auth";
import { removeSubscriptions } from "@/lib/outlook/outlook_sync";
import type { IntegrationsDB } from "@db/classes/integrations_db";
import type { OutlookDB } from "@db/classes/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import type { GraphMailServiceInterface } from "@/api_client/ms_graph/graph_mail_service";
import { ValidationError } from "./util/validation";

export async function getOutlookConnectionStatus(
  integrationsDb: IntegrationsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await integrationsDb.getOutlookConnection(user.id);

  return { connected: rows.length > 0 && rows[0].connected === true };
}

export async function disconnectOutlook(
  integrationsDb: IntegrationsDB,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface,
  graphMailService: GraphMailServiceInterface
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  try {
    await removeSubscriptions(
      user.id,
      outlookDb,
      graphAuthService,
      graphMailService
    );
  } catch (err) {
    console.error("[integrations] removeSubscriptions failed:", err);
  }

  await integrationsDb.deleteOutlookTokens(user.id);
  await integrationsDb.deleteOutlookEmails(user.id);

  return { success: true };
}
