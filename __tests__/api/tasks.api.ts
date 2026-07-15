import { GET, POST } from "@/app/api/tasks/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addProjectTasksAction, getAllTasks } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/tasks_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/tasks", () => ({
  getAllTasks: vi.fn(),
  addProjectTasksAction: vi.fn(),
}));

vi.mock("@db/tasks_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  tasksDrizzle: { __sentinel: "tasksDrizzle" },
}));

const postRequest = (body: unknown) =>
  new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/tasks", () => {
  it("401 unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getAllTasks).not.toHaveBeenCalled();
  });

  it("returns tasks from the lib fn wired with the db instance", async () => {
    const rows = [{ tasks: { id: 1 }, caseName: "Case A" }];
    (getAllTasks as Mock).mockResolvedValueOnce(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(getAllTasks).toHaveBeenCalledWith(tasksDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getAllTasks as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch tasks" });
  });
});

describe("POST /api/tasks", () => {
  it("401 unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest({ title: "New Task" }));

    expect(res.status).toBe(401);
    expect(addProjectTasksAction).not.toHaveBeenCalled();
  });

  it("creates the task through the lib fn with the wired db", async () => {
    const created = { id: 10, title: "New Task", userId: "user_1" };
    (addProjectTasksAction as Mock).mockResolvedValueOnce(created);

    const res = await POST(postRequest({ title: "New Task" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(created);
    expect(addProjectTasksAction).toHaveBeenCalledWith(
      { title: "New Task" },
      tasksDrizzle
    );
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (addProjectTasksAction as Mock).mockRejectedValueOnce(
      new ValidationError("title is required", 400)
    );

    const res = await POST(postRequest({}));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "title is required" });
  });

  it("returns 500 when the insert fails", async () => {
    (addProjectTasksAction as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await POST(postRequest({ title: "New Task" }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to create task" });
  });
});
