import { GET } from "@/app/api/files/[id]/download/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@db/db";
import { NextRequest } from "next/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// eslint-disable-next-line no-var
var mockDownload: jest.Mock;

jest.mock("@/lib/storage", () => {
  mockDownload = jest.fn();
  return { downloadFile: mockDownload };
});

jest.mock("@/lib/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

describe("GET /api/project-files/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockCtx(id: string) {
    return {
      params: Promise.resolve({ id }),
    };
  }

  it("returns 401 if not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
  });

  it("returns 404 if file not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    });

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });

  it("returns 500 if storage download fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            {
              id: 1,
              path: "file.pdf",
              name: "file.pdf",
              mimeType: "application/pdf",
            },
          ]),
      }),
    });

    mockDownload.mockRejectedValue(new Error("Storage error"));

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Download failed");
  });

  it("returns file buffer with correct headers on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ id: "user_1" });

    const mockFile = {
      id: 1,
      path: "file.pdf",
      name: "file.pdf",
      mimeType: "application/pdf",
    };

    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([mockFile]),
      }),
    });

    const fakeBytes = new Uint8Array([1, 2, 3]);
    mockDownload.mockResolvedValue(fakeBytes);

    const res = await GET({} as NextRequest, mockCtx("1"));

    expect(res.status).toBe(200);

    const resultBuffer = await res.arrayBuffer();
    expect(resultBuffer.byteLength).toBe(3);

    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      "attachment; filename=\"file.pdf\"; filename*=UTF-8''file.pdf"
    );
    expect(res.headers.get("Content-Length")).toBe("3");
  });
});
