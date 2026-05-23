import { GET } from "@/app/api/cases/get-cases/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { buildSelectChain } from "../_helpers/drizzle";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/cases/get-cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns cases with SQL-aggregated stats and clients", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

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

    (db.select as Mock)
      .mockReturnValueOnce(buildSelectChain(caseRows))
      .mockReturnValueOnce(buildSelectChain(clientRows));

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
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    (db.select as Mock)
      .mockReturnValueOnce(buildSelectChain([]))
      .mockReturnValueOnce(buildSelectChain([]));

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cases).toEqual([]);
    expect(json.allClients).toEqual([]);
  });

  it("computes percentage correctly for fully-completed cases", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    (db.select as Mock)
      .mockReturnValueOnce(
        buildSelectChain([
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
      .mockReturnValueOnce(buildSelectChain([]));

    const res = await GET();
    const json = await res.json();
    expect(json.cases[0].stats.percentage).toBe(100);
  });
});
