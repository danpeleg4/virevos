import type { OutlookDB } from "@db/classes/outlook_db";
import type { GraphAuthServiceInterface } from "@/api_client/ms_graph/graph_auth_service";
import { OUTLOOK_SCOPES } from "@/api_client/ms_graph/graph_auth_service";

export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
    response_mode: "query",
    scope: OUTLOOK_SCOPES,
    prompt: "consent",
    state,
  });

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeOutlookCode(
  code: string,
  graphAuthService: GraphAuthServiceInterface
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
}> {
  const { access_token, refresh_token, expires_in } =
    await graphAuthService.exchangeCode(code);
  const expires_at = Date.now() + expires_in * 1000;

  return { access_token, refresh_token: refresh_token ?? "", expires_at };
}

export async function getFreshOutlookAccessToken(
  userId: string,
  outlookDb: OutlookDB,
  graphAuthService: GraphAuthServiceInterface
): Promise<string | null> {
  const rows = await outlookDb.getTokenByUserId(userId);

  if (!rows.length) return null;

  const tokenData = rows[0];
  const now = Date.now();

  if (tokenData.expiresIn > now + 30000) {
    return tokenData.accessToken;
  }

  try {
    const { access_token, refresh_token, expires_in } =
      await graphAuthService.refreshToken(tokenData.refreshToken);
    const expires_at = Date.now() + expires_in * 1000;

    await outlookDb.updateToken(userId, {
      accessToken: access_token,
      expiresIn: expires_at,
      connected: true,
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
    });

    return access_token;
  } catch (error) {
    console.error("[outlook_access] Token refresh error:", error);
    return null;
  }
}
