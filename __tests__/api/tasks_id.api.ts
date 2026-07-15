import { PATCH, DELETE } from "@/app/api/tasks/[id]/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteTask, updateTask } from "@/lib/workspace/tasks";
import { tasksDrizzle } from "@db/tasks_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/tasks", () => ({
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@db/tasks_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  tasksDrizzle: { __sentinel: "tasksDrizzle" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const patchRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/tasks/1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const deleteRequest = () =>
  new NextRequest("http://localhost/api/tasks/1", { method: "DELETE" });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("PATCH /api/tasks/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await PATCH(
      patchRequest({ status: "completed" }),
      makeCtx("1")
    );

    expect(res.status).toBe(401);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await PATCH(
      patchRequest({ status: "completed" }),
      makeCtx("abc")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid task id" });
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("updates the task through the lib fn with the wired db", async () => {
    (updateTask as Mock).mockResolvedValueOnce(undefined);

    const res = await PATCH(
      patchRequest({ status: "completed", priority: "high" }),
      makeCtx("7")
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 7 });
    expect(updateTask).toHaveBeenCalledWith(
      { status: "completed", priority: "high", id: 7 },
      tasksDrizzle
    );
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (updateTask as Mock).mockRejectedValueOnce(
      new ValidationError("status must be one of in-progress, completed", 400)
    );

    const res = await PATCH(patchRequest({ status: "bogus" }), makeCtx("7"));

    expect(res.status).toBe(400);
  });

  it("returns 500 when the update fails", async () => {
    (updateTask as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await PATCH(
      patchRequest({ status: "completed" }),
      makeCtx("7")
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to update task" });
  });
});

describe("DELETE /api/tasks/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), makeCtx("1"));

    expect(res.status).toBe(401);
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await DELETE(deleteRequest(), makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("deletes the task through the lib fn with the wired db", async () => {
    (deleteTask as Mock).mockResolvedValueOnce(undefined);

    const res = await DELETE(deleteRequest(), makeCtx("42"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 42 });
    expect(deleteTask).toHaveBeenCalledWith(42, tasksDrizzle);
  });

  it("returns 500 when the delete fails", async () => {
    (deleteTask as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await DELETE(deleteRequest(), makeCtx("42"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to delete task" });
  });
});
