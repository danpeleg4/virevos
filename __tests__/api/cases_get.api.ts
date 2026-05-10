import { GET } from "@/app/api/cases/get-cases/route";
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

type ChainableQuery = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  then: (
    onFulfilled: (rows: unknown[]) => unknown,
    onRejected?: (err: unknown) => unknown
  ) => Promise<unknown>;
};

const buildChain = (rows: unknown[]): ChainableQuery => {
  const chain = {} as ChainableQuery;
  const passthrough = jest.fn(() => chain);
  chain.from = passthrough;
  chain.leftJoin = passthrough;
  chain.innerJoin = passthrough;
  chain.where = passthrough;
  chain.groupBy = passthrough;
  chain.orderBy = passthrough;
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(rows).then(onFulfilled, onRejected);
  return chain;
};

describe("GET /api/cases/get-cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns cases with SQL-aggregated stats and clients", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const caseRows = [
      {
        id: 1,
        name: "Case A",
        description: null,
        status: "active",
        dueDate: null,
        priority: "medium",
        clientId: 10,
        userId: "user_1",
        clientName: "Client A",
        totalTasks: 2,
        completedTasks: 1,
      },
      {
        id: 2,
        name: "Case B",
        description: null,
        status: "active",
        dueDate: null,
        priority: "low",
        clientId: null,
        userId: "user_1",
        clientName: null,
        totalTasks: 0,
        completedTasks: 0,
      },
    ];

    const clientRows = [
      { id: 10, name: "Client A" },
      { id: 11, name: "Client B" },
    ];

    (db.select as jest.Mock)
      .mockReturnValueOnce(buildChain(caseRows))
      .mockReturnValueOnce(buildChain(clientRows));

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.cases).toEqual([
      expect.objectContaining({
        id: 1,
        clientName: "Client A",
        stats: { totalTasks: 2, completedTasks: 1, percentage: 50 },
      }),
      expect.objectContaining({
        id: 2,
        clientName: null,
        stats: { totalTasks: 0, completedTasks: 0, percentage: 0 },
      }),
    ]);

    expect(json.allClients).toEqual(clientRows);
  });

  it("returns empty arrays when user has no cases or clients", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    (db.select as jest.Mock)
      .mockReturnValueOnce(buildChain([]))
      .mockReturnValueOnce(buildChain([]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cases).toEqual([]);
    expect(json.allClients).toEqual([]);
  });

  it("computes percentage correctly for fully-completed cases", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    (db.select as jest.Mock)
      .mockReturnValueOnce(
        buildChain([
          {
            id: 7,
            name: "Done",
            description: null,
            status: "active",
            dueDate: null,
            priority: "low",
            clientId: null,
            userId: "user_1",
            clientName: null,
            totalTasks: 4,
            completedTasks: 4,
          },
        ])
      )
      .mockReturnValueOnce(buildChain([]));

    const res = await GET();
    const json = await res.json();
    expect(json.cases[0].stats.percentage).toBe(100);
  });
});
