import { http, HttpResponse, type RequestHandler } from "msw";

export const outlookHandlers: RequestHandler[] = [
  http.post("/api/outlook/messages", () =>
    HttpResponse.json({ success: true })
  ),

  http.patch("/api/outlook/messages/:id", () =>
    HttpResponse.json({ success: true })
  ),

  http.delete("/api/outlook/messages/:id", () =>
    HttpResponse.json({ success: true })
  ),

  http.post("/api/outlook/sync", () => HttpResponse.json({ success: true })),

  http.get("/api/outlook/sync", () =>
    HttpResponse.json({ messages: [], page: 1, limit: 50, hasMore: false })
  ),
];
