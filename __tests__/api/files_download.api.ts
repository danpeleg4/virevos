import { GET, DELETE } from "@/app/api/files/[id]/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteCaseFile, downloadCaseFile } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/cases_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

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

const downloadRequest = (id: string) =>
  new NextRequest(`http://localhost/api/files/${id}?type=download`);

const deleteRequest = () => ({}) as NextRequest;

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("GET /api/files/[id]?type=download", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await GET(downloadRequest("7"), makeCtx("7"));

    expect(res.status).toBe(401);
    expect(downloadCaseFile).not.toHaveBeenCalled();
  });

  it("returns 404 when the file is missing", async () => {
    (downloadCaseFile as Mock).mockResolvedValueOnce(null);

    const res = await GET(downloadRequest("99"), makeCtx("99"));

    expect(res.status).toBe(404);
  });

  it("streams the file with download headers", async () => {
    (downloadCaseFile as Mock).mockResolvedValueOnce({
      body: new Uint8Array([1, 2, 3]),
      name: "contract.pdf",
      mimeType: "application/pdf",
    });

    const res = await GET(downloadRequest("7"), makeCtx("7"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("contract.pdf");
    expect(res.headers.get("Content-Length")).toBe("3");
    expect(downloadCaseFile).toHaveBeenCalledWith(
      7,
      casesDrizzle,
      supabaseStorageClient
    );
  });

  it("sanitizes non-ascii filenames in the disposition header", async () => {
    (downloadCaseFile as Mock).mockResolvedValueOnce({
      body: new Uint8Array([1]),
      name: "契約書.pdf",
      mimeType: null,
    });

    const res = await GET(downloadRequest("7"), makeCtx("7"));

    const disposition = res.headers.get("Content-Disposition")!;
    expect(disposition).toContain('filename="___.pdf"');
    expect(disposition).toContain("filename*=UTF-8''");
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("returns 500 when the storage download fails", async () => {
    (downloadCaseFile as Mock).mockRejectedValueOnce(
      new Error("Storage download failed: boom")
    );

    const res = await GET(downloadRequest("7"), makeCtx("7"));

    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/files/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await DELETE(deleteRequest(), makeCtx("7"));

    expect(res.status).toBe(401);
    expect(deleteCaseFile).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid id", async () => {
    const res = await DELETE(deleteRequest(), makeCtx("abc"));

    expect(res.status).toBe(400);
  });

  it("deletes the file through the lib fn with the wired deps", async () => {
    const res = await DELETE(deleteRequest(), makeCtx("7"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 7 });
    expect(deleteCaseFile).toHaveBeenCalledWith(
      7,
      casesDrizzle,
      supabaseStorageClient
    );
  });

  it("surfaces 'File not found' errors", async () => {
    (deleteCaseFile as Mock).mockRejectedValueOnce(new Error("File not found"));

    const res = await DELETE(deleteRequest(), makeCtx("7"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "File not found" });
  });
});
