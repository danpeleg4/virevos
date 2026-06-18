import { GET } from "@/app/api/files/[id]/route";
import { getCurrentUser } from "@/lib/supabase/auth";
import { db } from "@db/db";
import { NextRequest } from "next/server";

// The get-files route was consolidated into [id]/route.ts behind `?type=get-files`.
function getFilesReq(id = "1") {
  return new NextRequest(`http://localhost/api/files/${id}?type=get-files`);
}

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// The consolidated [id] route imports the storage layer at module load, which
// builds a Supabase client — stub it so import doesn't require live env vars.
vi.mock("@/lib/storage", () => ({ downloadFile: vi.fn() }));

vi.mock("@/lib/supabase/supabase", () => ({ FILES_BUCKET: "projectFiles" }));

describe("GET /api/files/[id]?type=get-files", () => {
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

    const res = await GET(getFilesReq(), mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 if caseId is invalid", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    const res = await GET(getFilesReq("abc"), mockCtx("abc"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid fileId" });
  });

  it("returns files for a valid caseId", async () => {
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

    const res = await GET(getFilesReq("10"), mockCtx("10"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockFiles);
  });
});
