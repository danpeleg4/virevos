import { GET, POST } from "@/app/api/tasks/route";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => {
  const where = jest.fn();
  const returning = jest.fn();
  const values = jest.fn().mockReturnValue({ returning });

  return {
    __esModule: true,
    where,
    returning,
    values,
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where,
          }),
          where,
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values,
      }),
    },
  };
});

const { where, returning, values: dbValues } = jest.requireMock("@db/db") as {
  where: jest.Mock;
  returning: jest.Mock;
  values: jest.Mock;
};

function req(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("GET /tasks", () => {
  it("401 unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns tasks", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    where.mockResolvedValueOnce([
      { tasks: { id: 1 }, projectName: "Project A" },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { tasks: { id: 1 }, projectName: "Project A" },
    ]);
  });
});

describe("POST /tasks", () => {
  it("401 unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await POST(req({ title: "Task" }));

    expect(res.status).toBe(401);
  });

  it("400 missing title", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await POST(req({ title: "   " }));

    expect(res.status).toBe(400);
  });

  it("201 creates task", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    returning.mockResolvedValueOnce([
      { id: 1, title: "Task", userId: "user_1" },
    ]);

    const res = await POST(
      req({
        title: "Task",
        description: "Desc",
        priority: "high",
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      task: { id: 1, title: "Task", userId: "user_1" },
    });
  });

  it("uses ISO string as default dueDate when none provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    returning.mockResolvedValueOnce([{ id: 1, title: "Task", userId: "user_1" }]);

    await POST(req({ title: "Task" }));

    const insertedValues = dbValues.mock.calls[0][0] as { dueDate: string };
    expect(insertedValues.dueDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("500 error", async () => {
    (currentUser as jest.Mock).mockRejectedValue(new Error("fail"));

    const res = await POST(req({ title: "Task" }));

    expect(res.status).toBe(500);
  });
});
