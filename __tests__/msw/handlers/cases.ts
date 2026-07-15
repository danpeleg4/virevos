import { http, HttpResponse, type RequestHandler } from "msw";

export const caseFixtures = [
  {
    id: 5,
    name: "Estate Case",
    description: null,
    status: "active",
    dueDate: "2026-08-01",
    priority: "medium",
    clientId: 1,
    userId: "user_1",
    clientName: "Jane Client",
    stats: { totalTasks: 2, completedTasks: 1, percentage: 50 },
  },
  {
    id: 6,
    name: "Contract Review",
    description: "Review vendor contracts",
    status: "completed",
    dueDate: "2026-05-01",
    priority: "high",
    clientId: null,
    userId: "user_1",
    clientName: null,
    stats: { totalTasks: 1, completedTasks: 1, percentage: 100 },
  },
];

export const clientFixturesForCases = [
  {
    id: 1,
    name: "Jane Client",
    email: "jane@client.com",
    phone: null,
    notes: null,
    status: "active",
    userId: "user_1",
    createdAt: null,
    updatedAt: null,
  },
];

export const caseNoteFixtures = [
  {
    id: 1,
    content: "Client called about deadline",
    caseId: 5,
    userId: "user_1",
    createdAt: null,
    updatedAt: null,
  },
];

export const caseFileFixtures = [
  {
    id: 7,
    caseId: 5,
    userId: "user_1",
    name: "contract.pdf",
    path: "projects/user_1/contract.pdf",
    size: 100,
    mimeType: "application/pdf",
    createdAt: null,
    updatedAt: null,
  },
];

export const casesHandlers: RequestHandler[] = [
  http.get("/api/cases/get-cases", () =>
    HttpResponse.json({
      cases: caseFixtures,
      allClients: clientFixturesForCases,
    })
  ),

  http.get("/api/cases/:id", ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      name: "Estate Case",
      clientId: 1,
      clientName: "Jane Client",
      dueDate: "2026-08-01",
      priority: "medium",
      status: "active",
    })
  ),

  http.post("/api/cases", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...body,
      id: 99,
      stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
    });
  }),

  http.patch("/api/cases/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),

  http.delete("/api/cases/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),

  http.get("/api/cases/:id/notes", () => HttpResponse.json(caseNoteFixtures)),

  http.post("/api/cases/:id/notes", () => HttpResponse.json({ success: true })),

  http.post("/api/cases/:id/files", () =>
    HttpResponse.json({
      path: "projects/user_1/upload.pdf",
      name: "upload.pdf",
      size: 100,
    })
  ),

  http.get("/api/files/user-files", () =>
    HttpResponse.json({ files: caseFileFixtures })
  ),

  http.get("/api/files/:id", () => HttpResponse.json(caseFileFixtures)),

  http.delete("/api/files/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),
];
