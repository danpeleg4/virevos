import { http, HttpResponse, type RequestHandler } from "msw";

export const portalClientFixture = {
  id: 1,
  name: "Portal Client",
  email: "client@example.com",
};

export const portalPayloadFixture = {
  client: portalClientFixture,
  settings: { title: "Portal" },
  cases: [] as unknown[],
  files: [] as unknown[],
  bookings: [] as unknown[],
  documentRequests: [] as unknown[],
};

export const portalHandlers: RequestHandler[] = [
  http.get("/api/portal", ({ request }) => {
    const type = new URL(request.url).searchParams.get("type");
    if (type === "bookings") return HttpResponse.json({ bookings: [] });
    return HttpResponse.json({ error: "No type found" }, { status: 400 });
  }),

  http.get("/api/portal/:token", ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "chat") {
      return HttpResponse.json({ messages: [] });
    }
    if (type === "availability") {
      return HttpResponse.json({ slots: [] });
    }
    return HttpResponse.json(portalPayloadFixture);
  }),

  http.post("/api/portal/:token/chat", async ({ request }) => {
    const body = (await request.json()) as { message: string };
    return HttpResponse.json({
      id: 1,
      senderType: "client",
      body: body.message,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  }),

  http.post("/api/portal/:token/bookings", () =>
    HttpResponse.json({ success: true, bookingId: 1 })
  ),

  http.post("/api/portal/:token/files", () =>
    HttpResponse.json({
      id: 1,
      name: "report.pdf",
      size: 4,
      mimeType: "application/pdf",
      path: "p",
      createdAt: new Date().toISOString(),
      caseId: 7,
    })
  ),

  http.post(
    "/api/portal/:token/document-requests/:itemId/upload",
    ({ params }) =>
      HttpResponse.json({
        itemId: Number(params.itemId),
        status: "uploaded",
        file: {
          id: 1,
          name: "doc.pdf",
          size: 4,
          mimeType: "application/pdf",
          path: "p",
        },
      })
  ),
];
