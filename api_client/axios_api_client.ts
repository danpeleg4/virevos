import axios, { AxiosRequestConfig } from "axios";

export interface AxiosClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T>;
}

export interface ScheduledEmailServiceInterface {
  getProfile(
    headers: Record<string, string>
  ): Promise<{ mail?: string; userPrincipalName?: string }>;
  draftMessage(
    headers: Record<string, string>,
    message: unknown
  ): Promise<{ id: string; conversationId: string }>;
  sendDraftMessage(
    headers: Record<string, string>,
    outlookId: string
  ): Promise<void>;
}

export class AxiosApiClient implements AxiosClient {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axios.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await axios.post<T>(url, data, config);
    return response.data;
  }

  //TODO ADD PATCH, PUT, DELETE METHODS AS NEEDED
}

export const axiosApiClient = new AxiosApiClient();

export class ScheduledEmailService implements ScheduledEmailServiceInterface {
  private api: AxiosClient;
  private readonly GRAPH_BASE = "https://graph.microsoft.com/v1.0";

  constructor(api: AxiosClient) {
    this.api = api;
  }

  async getProfile(
    headers: Record<string, string>
  ): Promise<{ mail?: string; userPrincipalName?: string }> {
    return this.api.get(`${this.GRAPH_BASE}/me`, { headers });
  }

  async draftMessage(
    headers: Record<string, string>,
    message: unknown
  ): Promise<{ id: string; conversationId: string }> {
    return this.api.post(`${this.GRAPH_BASE}/me/messages`, message, {
      headers,
    });
  }

  async sendDraftMessage(
    headers: Record<string, string>,
    outlookId: string
  ): Promise<void> {
    await this.api.post(
      `${this.GRAPH_BASE}/me/messages/${outlookId}/send`,
      {},
      { headers }
    );
  }
}

export const scheduledEmailService = new ScheduledEmailService(axiosApiClient);
