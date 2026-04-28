import { POST } from "@/app/api/portal/[token]/document-requests/[itemId]/upload/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// eslint-disable-next-line no-var
var mockUpload: jest.Mock;
jest.mock("@/lib/storage", () => {
  mockUpload = jest.fn();
  return { uploadFile: mockUpload };
});

jest.mock("@/lib/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

function mockCtx(token: string, itemId: string) {
  return { params: Promise.resolve({ token, itemId }) };
}

function mockRequest(file: File | null): NextRequest {
  const fd = new FormData();
  if (file) fd.append("file", file);
  return {
    formData: jest.fn().mockResolvedValue(fd),
  } as unknown as NextRequest;
}

function makeFile(size: number, type = "application/pdf", name = "doc.pdf") {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

const portalToken = {
  id: 10,
  clientId: 7,
  enabled: true,
  settings: { fileSharing: true },
  userId: "user_1",
};

function setupPortalLookup(rows: unknown[]) {
  // First select call: portal token lookup
  const tokenLimit = jest.fn().mockResolvedValue(rows);
  const tokenWhere = jest.fn(() => ({ limit: tokenLimit }));
  const tokenFrom = jest.fn(() => ({ where: tokenWhere }));
  return { from: tokenFrom };
}

function setupItemLookup(rows: unknown[]) {
  const itemLimit = jest.fn().mockResolvedValue(rows);
  const itemWhere = jest.fn(() => ({ limit: itemLimit }));
  const itemInnerJoin = jest.fn(() => ({ where: itemWhere }));
  const itemFrom = jest.fn(() => ({ innerJoin: itemInnerJoin }));
  return { from: itemFrom };
}

function setupCaseLookup(rows: unknown[]) {
  const caseLimit = jest.fn().mockResolvedValue(rows);
  const caseWhere = jest.fn(() => ({ limit: caseLimit }));
  const caseFrom = jest.fn(() => ({ where: caseWhere }));
  return { from: caseFrom };
}

describe("POST /api/portal/[token]/document-requests/[itemId]/upload", () => {
  it("returns 400 for invalid itemId", async () => {
    const res = await POST(mockRequest(null), mockCtx("tok", "abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid token", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(setupPortalLookup([]));
    const res = await POST(mockRequest(null), mockCtx("bad", "1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 for disabled portal", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(
      setupPortalLookup([{ ...portalToken, enabled: false }])
    );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when fileSharing is disabled", async () => {
    (db.select as jest.Mock).mockReturnValueOnce(
      setupPortalLookup([
        { ...portalToken, settings: { fileSharing: false } },
      ])
    );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when item is not found", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(setupItemLookup([]));
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when item belongs to a different client", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "pending",
            requestId: 1,
            requestStatus: "approved",
            requestClientId: 999,
          },
        ])
      );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when request is not approved", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "pending",
            requestId: 1,
            requestStatus: "pending_approval",
            requestClientId: 7,
          },
        ])
      );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(403);
  });

  it("returns 409 when item is already uploaded", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "uploaded",
            requestId: 1,
            requestStatus: "approved",
            requestClientId: 7,
          },
        ])
      );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(409);
  });

  it("returns 400 when no file provided", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "pending",
            requestId: 1,
            requestStatus: "approved",
            requestClientId: 7,
          },
        ])
      );
    const res = await POST(mockRequest(null), mockCtx("tok", "1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when file exceeds 10 MB", async () => {
    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "pending",
            requestId: 1,
            requestStatus: "approved",
            requestClientId: 7,
          },
        ])
      );
    const big = makeFile(11 * 1024 * 1024);
    const res = await POST(mockRequest(big), mockCtx("tok", "1"));
    expect(res.status).toBe(400);
  });

  it("uploads file, inserts caseFiles row, and marks item uploaded", async () => {
    const insertedRow = {
      id: 555,
      caseId: 22,
      userId: "user_1",
      name: "doc.pdf",
      path: "documents/user_1/req-1/now-doc.pdf",
      size: 100,
      mimeType: "application/pdf",
      createdAt: new Date(),
    };

    (db.select as jest.Mock)
      .mockReturnValueOnce(setupPortalLookup([portalToken]))
      .mockReturnValueOnce(
        setupItemLookup([
          {
            itemId: 1,
            itemStatus: "pending",
            requestId: 1,
            requestStatus: "approved",
            requestClientId: 7,
          },
        ])
      )
      .mockReturnValueOnce(setupCaseLookup([{ id: 22 }]));

    const returning = jest.fn().mockResolvedValue([insertedRow]);
    const insertValues = jest.fn(() => ({ returning }));
    (db.insert as jest.Mock).mockReturnValue({ values: insertValues });

    const updateWhere = jest.fn().mockResolvedValue(undefined);
    const updateSet = jest.fn(() => ({ where: updateWhere }));
    (db.update as jest.Mock).mockReturnValue({ set: updateSet });

    mockUpload.mockResolvedValueOnce(undefined);

    const file = makeFile(100);
    const res = await POST(mockRequest(file), mockCtx("tok", "1"));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.itemId).toBe(1);
    expect(json.file.id).toBe(555);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 22,
        userId: "user_1",
      })
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "uploaded",
        uploadedFileId: 555,
        uploadedAt: expect.any(Date),
      })
    );
  });
});
