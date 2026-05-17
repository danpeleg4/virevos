import { GET } from "@/app/api/tasks/route";
import { getCurrentUser } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const { where } = vi.hoisted(() => ({ where: vi.fn() }));

vi.mock("@db/db", () => ({
  __esModule: true,
  where,
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where,
        }),
        where,
      }),
    }),
  },
}));

describe("GET /tasks", () => {
  it("401 unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("returns tasks", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

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
