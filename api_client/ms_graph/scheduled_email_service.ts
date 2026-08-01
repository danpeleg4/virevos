import { AxiosClient, axiosApiClient } from "../axios_api_client";
import { GRAPH_BASE, rethrowGraphError } from "./graph_error";

export interface ScheduledEmailServiceInterface {
  getProfile(
    headers: Record<string, string>
  ): Promise<{ mail?: string; userPrincipalName?: string }>;
  draftMessage(
    headers: Record<string, string>,
    message: unknown
  ): Promise<{ id: string; conversationId: string }>;
  addAttachment(
    headers: Record<string, string>,
    outlookId: string,
    payload: { name: string; contentType: string; contentBytes: string }
  ): Promise<void>;
  sendDraftMessage(
    headers: Record<string, string>,
    outlookId: string
  ): Promise<void>;
}

export class ScheduledEmailService implements ScheduledEmailServiceInterface {
  constructor(private readonly api: AxiosClient) {}

  async getProfile(
    headers: Record<string, string>
  ): Promise<{ mail?: string; userPrincipalName?: string }> {
    try {
      return await this.api.get(`${GRAPH_BASE}/me`, { headers });
    } catch (err) {
      rethrowGraphError(err);
    }
  }

  async draftMessage(
    headers: Record<string, string>,
    message: unknown
  ): Promise<{ id: string; conversationId: string }> {
    try {
      return await this.api.post(`${GRAPH_BASE}/me/messages`, message, {
        headers,
      });
    } catch (err) {
      rethrowGraphError(err);
    }
  }

  async addAttachment(
    headers: Record<string, string>,
    outlookId: string,
    payload: { name: string; contentType: string; contentBytes: string }
  ): Promise<void> {
    try {
      await this.api.post(
        `${GRAPH_BASE}/me/messages/${outlookId}/attachments`,
        { "@odata.type": "#microsoft.graph.fileAttachment", ...payload },
        { headers }
      );
    } catch (err) {
      rethrowGraphError(err);
    }
  }

  async sendDraftMessage(
    headers: Record<string, string>,
    outlookId: string
  ): Promise<void> {
    try {
      await this.api.post(
        `${GRAPH_BASE}/me/messages/${outlookId}/send`,
        {},
        { headers }
      );
    } catch (err) {
      rethrowGraphError(err);
    }
  }
}

export const scheduledEmailService = new ScheduledEmailService(axiosApiClient);
