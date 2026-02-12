import { GET } from "@/app/api/clients/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

describe("GET /api/clients", () => {
  const mockUser = { id: "user_123" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);

    const text = await response.text();
    expect(text).toBe("Unauthorized");
  });

  it("returns clients with project counts", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);

    const mockResult = [
      {
        id: "1",
        name: "Client A",
        totalProjects: 3,
        completedProjects: 1,
        activeProjects: 2,
      },
    ];

    // Mock the drizzle chain
    const mockGroupBy = jest.fn().mockResolvedValue(mockResult);
    const mockWhere = jest.fn(() => ({ groupBy: mockGroupBy }));
    const mockLeftJoin = jest.fn(() => ({ where: mockWhere }));
    const mockFrom = jest.fn(() => ({ leftJoin: mockLeftJoin }));

    (db.select as jest.Mock).mockReturnValue({
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
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.select as jest.Mock).mockImplementation(() => {
      throw new Error("DB failure");
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ message: "Server error" });
  });
});
