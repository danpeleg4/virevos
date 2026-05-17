import { GET } from "@/app/api/clients/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/clients", () => {
  const mockUser = { id: "user_123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);

    const text = await response.text();
    expect(text).toBe("Unauthorized");
  });

  it("returns clients with project counts", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    const mockResult = [
      {
        id: "1",
        name: "Client A",
        totalCases: 3,
        completedCases: 1,
        activeCases: 2,
      },
    ];

    // Mock the drizzle chain
    const mockGroupBy = vi.fn().mockResolvedValue(mockResult);
    const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }));
    const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
    const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin }));

    (db.select as Mock).mockReturnValue({
      from: mockFrom,
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(mockResult);

    expect(db.select).toHaveBeenCalled();
    expect(mockGroupBy).toHaveBeenCalled();
  });

  it("returns 500 if database throws", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (db.select as Mock).mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ message: "Server error" });
  });
});
