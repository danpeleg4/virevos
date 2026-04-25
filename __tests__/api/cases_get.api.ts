import { GET } from "@/app/api/cases/get-cases/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    query: {
      cases: {
        findMany: jest.fn(),
      },
    },
    select: jest.fn(),
  },
}));

describe("GET /api/cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns cases with stats and clients", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.query.cases.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: "Case A",
        tasks: [
          { id: 1, completed: true },
          { id: 2, completed: false },
        ],
        client: { id: 10, name: "Client A" },
      },
      {
        id: 2,
        name: "Case B",
        tasks: [],
        client: null,
      },
    ]);
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        orderBy: () => ({
          where: () =>
            Promise.resolve([
              { id: 10, name: "Client A" },
              { id: 11, name: "Client B" },
            ]),
        }),
      }),
    });

    const res = await GET();

    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.cases).toEqual([
      expect.objectContaining({
        id: 1,
        clientName: "Client A",
        stats: {
          totalTasks: 2,
          completedTasks: 1,
          percentage: 50,
        },
      }),
      expect.objectContaining({
        id: 2,
        clientName: null,
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          percentage: 0,
        },
      }),
    ]);

    expect(json.allClients).toEqual([
      { id: 10, name: "Client A" },
      { id: 11, name: "Client B" },
    ]);
  });
});
