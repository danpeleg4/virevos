import { http, HttpResponse, type RequestHandler } from "msw";

export const eventFixtures = [
  {
    id: "evt-1",
    title: "Team Sync",
    description: "Weekly sync",
    link: null,
    dateTime: "2026-08-01T10:00:00.000Z",
    duration: 30,
    isMeeting: true,
    status: "upcoming",
    tags: [],
    hasNotes: false,
    hasTranscript: false,
    autoRescheduled: false,
    conflictReason: null,
    origin: "app",
    outlookEventId: null,
    clientId: null,
    userId: "user_1",
    attendees: [],
  },
];

export const eventsHandlers: RequestHandler[] = [
  http.get("/api/events", () => HttpResponse.json(eventFixtures)),

  http.post("/api/events", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...eventFixtures[0], ...body, id: "evt-new" });
  }),

  http.get("/api/events/:id", ({ params }) =>
    HttpResponse.json({
      meeting: { ...eventFixtures[0], id: String(params.id) },
      isHost: true,
    })
  ),

  http.patch("/api/events/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: String(params.id) })
  ),

  http.delete("/api/events/:id", () => HttpResponse.json({ success: true })),
];
