import { http, HttpResponse, type RequestHandler } from "msw";

export const demoRequestsHandlers: RequestHandler[] = [
  http.post("/api/demo-requests", () =>
    HttpResponse.json({ success: true, id: 1 })
  ),
];
