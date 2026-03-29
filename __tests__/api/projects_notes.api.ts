import { GET } from "@/app/api/projects/[id]/notes/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

function makeCtx(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("GET /api/projects/[id]/notes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as never, makeCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid projectId", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as never, makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid projectId" });
  });

  it("returns notes", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const rows = [
      { id: 2, content: "b" },
      { id: 1, content: "a" },
    ];

    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
      }),
    });

    const res = await GET({} as never, makeCtx("42"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
  });
});
