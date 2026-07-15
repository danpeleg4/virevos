import { AxiosClient, axiosApiClient } from "../axios_api_client";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

export const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
  "Mail.ReadWrite",
  "Mail.Send",
  "MailboxSettings.Read",
  "Calendars.Read",
  "Mail.Read",
].join(" ");

export interface GraphTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface GraphAuthServiceInterface {
  exchangeCode(code: string): Promise<GraphTokenResponse>;
  refreshToken(refreshToken: string): Promise<GraphTokenResponse>;
}

export class GraphAuthService implements GraphAuthServiceInterface {
  constructor(private readonly api: AxiosClient) {}

  async exchangeCode(code: string): Promise<GraphTokenResponse> {
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
      scope: OUTLOOK_SCOPES,
    });

    return this.api.post<GraphTokenResponse>(TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  async refreshToken(refreshToken: string): Promise<GraphTokenResponse> {
    const params = new URLSearchParams({
      client_id: process.env.OUTLOOK_CLIENT_ID!,
      client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: OUTLOOK_SCOPES,
    });

    return this.api.post<GraphTokenResponse>(TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }
}

export const graphAuthService = new GraphAuthService(axiosApiClient);
