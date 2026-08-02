import { GET } from "@/app/api/cases/[id]/tasks/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTasksByCase } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/classes/tasks_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/tasks", () => ({
  getTasksByCase: vi.fn(),
}));

vi.mock("@db/classes/tasks_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  tasksDrizzle: { __sentinel: "tasksDrizzle" },
}));

function makeCtx(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

let consoleErrorSpy: MockInstance;

describe("GET /api/cases/[id]/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as never, makeCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(getTasksByCase).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid caseId", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as never, makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid caseId" });
    expect(getTasksByCase).not.toHaveBeenCalled();
  });

  it("returns tasks from the lib fn wired with the db instance", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const rows = [
      { id: 1, title: "Task A" },
      { id: 2, title: "Task B" },
    ];
    (getTasksByCase as Mock).mockResolvedValueOnce(rows);

    const res = await GET({} as never, makeCtx("10"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(getTasksByCase).toHaveBeenCalledWith(10, tasksDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    (getTasksByCase as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET({} as never, makeCtx("10"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to fetch tasks" });
  });
});
