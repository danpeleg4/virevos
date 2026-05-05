import { GET } from "@/app/api/tasks/route";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => {
  const where = jest.fn();

  return {
    __esModule: true,
    where,
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where,
          }),
          where,
        }),
      }),
    },
  };
});

const { where } = jest.requireMock("@db/db") as {
  where: jest.Mock;
};

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
