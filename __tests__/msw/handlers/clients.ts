import { http, HttpResponse, type RequestHandler } from "msw";

export const clientListFixtures = [
  {
    id: 1,
    name: "Jane Client",
    email: "jane@client.com",
    phone: "555-0100",
    status: "active",
    notes: null,
    createdAt: null,
    updatedAt: null,
    totalCases: 2,
    completedCases: 1,
    activeCases: 1,
  },
  {
    id: 2,
    name: "Acme Corp",
    email: "info@acme.com",
    phone: null,
    status: "inactive",
    notes: null,
    createdAt: null,
    updatedAt: null,
    totalCases: 0,
    completedCases: 0,
    activeCases: 0,
  },
];

export const clientsHandlers: RequestHandler[] = [
  http.get("/api/clients", () => HttpResponse.json(clientListFixtures)),

  http.post("/api/clients", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...body,
      id: 42,
      status: "active",
      userId: "user_1",
    });
  }),

  http.get("/api/clients/portal", () =>
    HttpResponse.json([
      { id: 1, name: "Jane Client", email: "jane@client.com" },
    ])
  ),

  http.get("/api/clients/:id", ({ request, params }) => {
    const type = new URL(request.url).searchParams.get("type");
    const clientId = Number(params.id);
    if (type === "main") {
      return HttpResponse.json({
        client: { ...clientListFixtures[0], id: clientId },
        portal: null,
      });
    }
    if (type === "cases") return HttpResponse.json({ cases: [] });
    if (type === "outlook-emails") return HttpResponse.json({ emails: [] });
    if (type === "portal") return HttpResponse.json({ portal: null });
    return HttpResponse.json({ error: "Invalid type" }, { status: 400 });
  }),

  http.patch("/api/clients/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),

  http.delete("/api/clients/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),
];
