import { GET } from "@/app/api/files/[id]/get-files/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("GET /api/project-files/project/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockCtx(id: string) {
    return {
      params: Promise.resolve({ id }),
    };
  }

  it("returns 401 if user is not authenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 if projectId is invalid", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET({} as NextRequest, mockCtx("abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid caseId" });
  });

  it("returns files for a valid projectId", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const mockFiles = [
      { id: 1, projectId: 10, name: "file1.pdf" },
      { id: 2, projectId: 10, name: "file2.pdf" },
    ];

    (db.select as Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve(mockFiles),
      }),
    });

    const res = await GET({} as NextRequest, mockCtx("10"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockFiles);
  });
});
