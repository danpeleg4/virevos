import { POST } from "@/app/api/portal/[token]/files/upload/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  vi.clearAllMocks();
});

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

// eslint-disable-next-line no-var
var mockUploadFile: Mock;
// eslint-disable-next-line no-var
var mockDeleteFile: Mock;

vi.mock("@/lib/storage", () => {
  mockUploadFile = vi.fn().mockResolvedValue(undefined);
  mockDeleteFile = vi.fn().mockResolvedValue(undefined);
  return { uploadFile: mockUploadFile, deleteFile: mockDeleteFile };
});

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

// eslint-disable-next-line no-var
var mockAssertCanAddFile: Mock;

vi.mock("@/lib/plan_limits", () => {
  mockAssertCanAddFile = vi.fn().mockResolvedValue(undefined);
  return { assertCanAddFile: mockAssertCanAddFile };
});

// ── Helpers ────────────────────────────────────────────────────────────────
const makeParams = (token: string) => Promise.resolve({ token });

function makeFormData(
  fileName = "test.pdf",
  fileSizeBytes = 1024,
  caseId?: number
) {
  const file = new File(["x".repeat(fileSizeBytes)], fileName, {
    type: "application/pdf",
  });
  const fd = new FormData();
  fd.append("file", file);
  if (caseId !== undefined) fd.append("caseId", String(caseId));
  return fd;
}

function makeRequest(token: string, formData: FormData) {
  return new NextRequest(`http://localhost/api/portal/${token}/files/upload`, {
    method: "POST",
    body: formData,
  });
}

function mockSelectChain(results: unknown[]) {
  const mockLimit = vi.fn().mockResolvedValue(results);
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  (db.select as Mock).mockReturnValueOnce({ from: mockFrom });
  return { mockLimit, mockWhere, mockFrom };
}

// Wires `db.transaction` so the inner callback runs against tx.insert/tx.update mocks
// and returns the inserted row (or throws on failure).
function mockTransaction(insertedRow: unknown | Error) {
  const txInsertReturning = vi.fn().mockImplementation(() => {
    if (insertedRow instanceof Error) throw insertedRow;
    return Promise.resolve([insertedRow]);
  });
  const txInsertValues = vi.fn(() => ({ returning: txInsertReturning }));
  const txInsert = vi.fn(() => ({ values: txInsertValues }));
  const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
  const txUpdate = vi.fn(() => ({ set: txUpdateSet }));
  (db.transaction as Mock).mockImplementationOnce(
    async (fn: (tx: { insert: Mock; update: Mock }) => Promise<unknown>) =>
      fn({ insert: txInsert, update: txUpdate })
  );
  return { txInsert, txInsertValues, txUpdate, txUpdateSet };
}

const mockToken = {
  id: 1,
  clientId: 10,
  userId: "user_1",
  token: "valid-token",
  enabled: true,
  settings: { fileSharing: true },
};

const mockProject = { id: 42 };

const mockInsertedFile = {
  id: 99,
  name: "test.pdf",
  size: 1024,
  mimeType: "application/pdf",
  path: "projects/user_1/portal/xxx-test.pdf",
  createdAt: new Date().toISOString(),
};

// ── Tests ──────────────────────────────────────────────────────────────────
describe("POST /api/portal/[token]/files/upload", () => {
  describe("token validation", () => {
    it("returns 404 when token not found", async () => {
      mockSelectChain([]);

      const req = makeRequest("bad-token", makeFormData());
      const res = await POST(req, { params: makeParams("bad-token") });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/not found/i);
    });

    it("returns 404 when portal is disabled", async () => {
      mockSelectChain([{ ...mockToken, enabled: false }]);

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(404);
    });
  });

  describe("fileSharing setting", () => {
    it("returns 403 when fileSharing is explicitly disabled", async () => {
      mockSelectChain([{ ...mockToken, settings: { fileSharing: false } }]);

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/file sharing/i);
    });
  });

  describe("file validation", () => {
    it("returns 400 when no file is provided", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client

      const fd = new FormData(); // no file
      const req = makeRequest("valid-token", fd);
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/no file/i);
    });

    it("returns 400 when file exceeds 10 MB", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client

      const oversizedBytes = 11 * 1024 * 1024;
      const req = makeRequest(
        "valid-token",
        makeFormData("big.pdf", oversizedBytes)
      );
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/10 MB/i);
    });
  });

  describe("case resolution", () => {
    it("returns 400 when client has no cases and no caseId supplied", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([]); // no cases found

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/no cases/i);
    });

    it("returns 403 when supplied caseId does not belong to client", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([]); // case ownership check → empty

      const fd = makeFormData("doc.pdf", 512, 999);
      const req = makeRequest("valid-token", fd);
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/does not belong/i);
    });
  });

  describe("successful upload", () => {
    it("uploads file and returns 201 with metadata (auto project)", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([mockProject]); // first project for client

      const { txInsert, txUpdate, txUpdateSet } =
        mockTransaction(mockInsertedFile);

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(mockInsertedFile.id);
      expect(json.name).toBe(mockInsertedFile.name);
      expect(json.caseId).toBe(mockProject.id);
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(txInsert).toHaveBeenCalledTimes(1);
      expect(txUpdate).toHaveBeenCalledTimes(1);
      // storage increment fired with a sql expression — assert .set ran exactly once
      expect(txUpdateSet).toHaveBeenCalledTimes(1);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it("uploads file and returns 201 when projectId is explicitly supplied", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([{ id: mockProject.id }]); // ownership check

      mockTransaction(mockInsertedFile);

      const fd = makeFormData("doc.pdf", 512, mockProject.id); // explicit caseId
      const req = makeRequest("valid-token", fd);
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.caseId).toBe(mockProject.id);
    });
  });

  describe("storage quota", () => {
    it("returns 500 and skips upload when assertCanAddFile rejects", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client

      mockAssertCanAddFile.mockRejectedValueOnce(
        new Error("Storage limit reached. The Free plan includes 1GB.")
      );

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(500);
      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe("orphan cleanup", () => {
    it("deletes uploaded file when DB transaction fails", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([mockProject]); // first project for client

      mockTransaction(new Error("boom"));

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(500);
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(mockDeleteFile).toHaveBeenCalledTimes(1);
      // verify the cleaned-up path matches what was uploaded
      const uploadedPath = mockUploadFile.mock.calls[0][1];
      const deletedPath = mockDeleteFile.mock.calls[0][1];
      expect(deletedPath).toBe(uploadedPath);
    });

    it("still returns 500 if cleanup itself fails", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([mockProject]); // first project for client

      mockTransaction(new Error("db down"));
      mockDeleteFile.mockRejectedValueOnce(new Error("storage also down"));

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(500);
      expect(mockDeleteFile).toHaveBeenCalledTimes(1);
    });
  });
});
