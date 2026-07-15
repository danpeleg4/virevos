import { http, HttpResponse, type RequestHandler } from "msw";
import type { StreamEvent } from "@/types/ai";

export function chatStreamBody(events: StreamEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

export const aiHandlers: RequestHandler[] = [
  http.post("/api/chat", () =>
    HttpResponse.text(
      chatStreamBody([
        { type: "text_delta", delta: "Hello!" },
        { type: "done", response_id: "resp_1" },
      ]),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    )
  ),

  http.get("/api/document-requests/pending", () => HttpResponse.json([])),

  http.patch("/api/portal-bookings/:id", () =>
    HttpResponse.json({ success: true })
  ),
];
