import { AxiosClient, axiosApiClient } from "../axios_api_client";
import { GRAPH_BASE } from "./graph_error";

export interface GraphDeltaResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

export interface GraphSubscriptionResponse {
  id: string;
  expirationDateTime: string;
}

export interface GraphMailServiceInterface {
  sendMail(accessToken: string, message: unknown): Promise<void>;
  replyMail(
    accessToken: string,
    outlookMessageId: string,
    message: unknown
  ): Promise<void>;
  createDraft(accessToken: string, message: unknown): Promise<{ id: string }>;
  createReplyDraft(
    accessToken: string,
    outlookMessageId: string,
    message: unknown
  ): Promise<{ id: string }>;
  sendDraft(accessToken: string, draftId: string): Promise<void>;
  addSmallAttachment(
    accessToken: string,
    draftId: string,
    payload: { name: string; contentType: string; contentBytes: string }
  ): Promise<void>;
  createUploadSession(
    accessToken: string,
    draftId: string,
    name: string,
    size: number
  ): Promise<{ uploadUrl: string }>;
  uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    contentType: string,
    contentRange: string
  ): Promise<void>;
  patchMessage(
    accessToken: string,
    outlookMessageId: string,
    patch: Record<string, unknown>
  ): Promise<void>;
  moveMessage(
    accessToken: string,
    outlookMessageId: string,
    destinationId: string
  ): Promise<void>;
  deleteMessage(accessToken: string, outlookMessageId: string): Promise<void>;
  listAttachments<T>(
    accessToken: string,
    outlookMessageId: string
  ): Promise<{ value: T[] }>;
  getAttachmentContent<T>(
    accessToken: string,
    outlookMessageId: string,
    attachmentId: string
  ): Promise<T>;
  fetchDelta<T>(
    accessToken: string,
    url: string
  ): Promise<GraphDeltaResponse<T>>;
  createSubscription(
    accessToken: string,
    payload: Record<string, unknown>
  ): Promise<GraphSubscriptionResponse>;
  renewSubscription(
    accessToken: string,
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<void>;
  deleteSubscription(
    accessToken: string,
    subscriptionId: string
  ): Promise<void>;
}

export class GraphMailService implements GraphMailServiceInterface {
  constructor(private readonly api: AxiosClient) {}

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async sendMail(accessToken: string, message: unknown): Promise<void> {
    await this.api.post(
      `${GRAPH_BASE}/me/sendMail`,
      { message, saveToSentItems: true },
      { headers: this.headers(accessToken) }
    );
  }

  async replyMail(
    accessToken: string,
    outlookMessageId: string,
    message: unknown
  ): Promise<void> {
    await this.api.post(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}/reply`,
      { message },
      { headers: this.headers(accessToken) }
    );
  }

  async createDraft(
    accessToken: string,
    message: unknown
  ): Promise<{ id: string }> {
    return this.api.post(`${GRAPH_BASE}/me/messages`, message, {
      headers: this.headers(accessToken),
    });
  }

  async createReplyDraft(
    accessToken: string,
    outlookMessageId: string,
    message: unknown
  ): Promise<{ id: string }> {
    return this.api.post(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}/createReply`,
      { message },
      { headers: this.headers(accessToken) }
    );
  }

  async sendDraft(accessToken: string, draftId: string): Promise<void> {
    await this.api.post(
      `${GRAPH_BASE}/me/messages/${draftId}/send`,
      {},
      { headers: this.headers(accessToken) }
    );
  }

  async addSmallAttachment(
    accessToken: string,
    draftId: string,
    payload: { name: string; contentType: string; contentBytes: string }
  ): Promise<void> {
    await this.api.post(
      `${GRAPH_BASE}/me/messages/${draftId}/attachments`,
      { "@odata.type": "#microsoft.graph.fileAttachment", ...payload },
      { headers: this.headers(accessToken) }
    );
  }

  async createUploadSession(
    accessToken: string,
    draftId: string,
    name: string,
    size: number
  ): Promise<{ uploadUrl: string }> {
    return this.api.post(
      `${GRAPH_BASE}/me/messages/${draftId}/attachments/createUploadSession`,
      { AttachmentItem: { attachmentType: "file", name, size } },
      { headers: this.headers(accessToken) }
    );
  }

  async uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    contentType: string,
    contentRange: string
  ): Promise<void> {
    await this.api.put(uploadUrl, chunk, {
      headers: {
        "Content-Range": contentRange,
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
      },
    });
  }

  async patchMessage(
    accessToken: string,
    outlookMessageId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    await this.api.patch(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}`,
      patch,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async moveMessage(
    accessToken: string,
    outlookMessageId: string,
    destinationId: string
  ): Promise<void> {
    await this.api.post(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}/move`,
      { destinationId },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async deleteMessage(
    accessToken: string,
    outlookMessageId: string
  ): Promise<void> {
    await this.api.delete(`${GRAPH_BASE}/me/messages/${outlookMessageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async listAttachments<T>(
    accessToken: string,
    outlookMessageId: string
  ): Promise<{ value: T[] }> {
    return this.api.get(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}/attachments?$select=id,name,size,contentType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async getAttachmentContent<T>(
    accessToken: string,
    outlookMessageId: string,
    attachmentId: string
  ): Promise<T> {
    return this.api.get(
      `${GRAPH_BASE}/me/messages/${outlookMessageId}/attachments/${encodeURIComponent(attachmentId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async fetchDelta<T>(
    accessToken: string,
    url: string
  ): Promise<GraphDeltaResponse<T>> {
    return this.api.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createSubscription(
    accessToken: string,
    payload: Record<string, unknown>
  ): Promise<GraphSubscriptionResponse> {
    return this.api.post(`${GRAPH_BASE}/subscriptions`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async renewSubscription(
    accessToken: string,
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<void> {
    await this.api.patch(
      `${GRAPH_BASE}/subscriptions/${subscriptionId}`,
      { expirationDateTime },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async deleteSubscription(
    accessToken: string,
    subscriptionId: string
  ): Promise<void> {
    await this.api.delete(`${GRAPH_BASE}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const graphMailService = new GraphMailService(axiosApiClient);
