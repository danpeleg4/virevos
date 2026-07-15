import { http, HttpResponse, type RequestHandler } from "msw";
import type { Task } from "@/types/tasks";

export const taskFixtures: { tasks: Task; caseName: string | null }[] = [
  {
    tasks: {
      id: 1,
      userId: "user_1",
      title: "Design UI mockups",
      description: "Create wireframes",
      caseId: 5,
      priority: "medium",
      status: "in-progress",
      dueDate: "2026-04-01",
      completed: false,
      createdAt: null,
      updatedAt: null,
    },
    caseName: "Estate Case",
  },
  {
    tasks: {
      id: 2,
      userId: "user_1",
      title: "Review contract",
      description: null,
      caseId: null,
      priority: "high",
      status: "completed",
      dueDate: "2026-03-20",
      completed: true,
      createdAt: null,
      updatedAt: null,
    },
    caseName: null,
  },
];

export const tasksHandlers: RequestHandler[] = [
  http.get("/api/tasks", () => HttpResponse.json(taskFixtures)),

  http.post("/api/tasks", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...taskFixtures[0].tasks,
      ...body,
      id: 99,
    });
  }),

  http.patch("/api/tasks/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),

  http.delete("/api/tasks/:id", ({ params }) =>
    HttpResponse.json({ success: true, id: Number(params.id) })
  ),

  http.get("/api/cases/:id/tasks", () =>
    HttpResponse.json([taskFixtures[0].tasks])
  ),
];
