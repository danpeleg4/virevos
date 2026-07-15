import { AxiosClient, axiosApiClient } from "../axios_api_client";
import { GRAPH_BASE } from "./graph_error";

export type GraphEventPayload = {
  subject?: string;
  body?: { contentType: string; content: string };
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
};

export interface GraphCalendarServiceInterface {
  createEvent(
    accessToken: string,
    event: GraphEventPayload
  ): Promise<{ id: string }>;
  updateEvent(
    accessToken: string,
    eventId: string,
    patch: GraphEventPayload
  ): Promise<void>;
  deleteEvent(accessToken: string, eventId: string): Promise<void>;
}

export class GraphCalendarService implements GraphCalendarServiceInterface {
  constructor(private readonly api: AxiosClient) {}

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async createEvent(
    accessToken: string,
    event: GraphEventPayload
  ): Promise<{ id: string }> {
    return this.api.post<{ id: string }>(`${GRAPH_BASE}/me/events`, event, {
      headers: this.headers(accessToken),
    });
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    patch: GraphEventPayload
  ): Promise<void> {
    await this.api.patch(`${GRAPH_BASE}/me/events/${eventId}`, patch, {
      headers: this.headers(accessToken),
    });
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    await this.api.delete(`${GRAPH_BASE}/me/events/${eventId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

export const graphCalendarService = new GraphCalendarService(axiosApiClient);
