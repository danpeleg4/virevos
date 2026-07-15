import { GET } from "@/app/api/files/[id]/route";
import { GET as GET_USER_FILES } from "@/app/api/files/user-files/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getCaseFiles, getUserFiles } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  deleteCaseFile: vi.fn(),
  downloadCaseFile: vi.fn(),
  getCaseFiles: vi.fn(),
  getUserFiles: vi.fn(),
}));

vi.mock("@db/cases_db", () => ({
  // sentinel — the routes must pass this exact instance into the lib fns
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const getFilesRequest = (id: string) =>
  new NextRequest(`http://localhost/api/files/${id}?type=get-files`);

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/files/[id]?type=get-files", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(getFilesRequest("5"), makeCtx("5"));

    expect(res.status).toBe(401);
    expect(getCaseFiles).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid id", async () => {
    const res = await GET(getFilesRequest("abc"), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("returns 400 when no type is provided", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/files/5"),
      makeCtx("5")
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No type found" });
  });

  it("returns the case files from the wired db", async () => {
    const files = [{ id: 7, name: "contract.pdf", caseId: 5 }];
    (getCaseFiles as Mock).mockResolvedValueOnce(files);

    const res = await GET(getFilesRequest("5"), makeCtx("5"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(files);
    expect(getCaseFiles).toHaveBeenCalledWith(5, casesDrizzle);
  });
});

describe("GET /api/files/user-files", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET_USER_FILES();

    expect(res.status).toBe(401);
    expect(getUserFiles).not.toHaveBeenCalled();
  });

  it("returns the user's files from the wired db", async () => {
    const files = [{ id: 7, name: "contract.pdf", caseName: "Estate Case" }];
    (getUserFiles as Mock).mockResolvedValueOnce(files);

    const res = await GET_USER_FILES();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ files });
    expect(getUserFiles).toHaveBeenCalledWith(casesDrizzle);
  });

  it("returns 500 when the query fails", async () => {
    (getUserFiles as Mock).mockRejectedValueOnce(new Error("db down"));

    const res = await GET_USER_FILES();

    expect(res.status).toBe(500);
  });
});
