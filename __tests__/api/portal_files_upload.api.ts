import { POST } from "@/app/api/portal/[token]/files/upload/route";
import { db } from "@db/db";
import { NextRequest } from "next/server";

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  jest.clearAllMocks();
});

jest.mock("@db/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

// eslint-disable-next-line no-var
var mockUploadFile: jest.Mock;

jest.mock("@/lib/storage", () => {
  mockUploadFile = jest.fn().mockResolvedValue(undefined);
  return { uploadFile: mockUploadFile };
});

jest.mock("@/lib/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

// ── Helpers ────────────────────────────────────────────────────────────────
const makeParams = (token: string) => Promise.resolve({ token });

function makeFormData(
  fileName = "test.pdf",
  fileSizeBytes = 1024,
  projectId?: number
) {
  const file = new File(["x".repeat(fileSizeBytes)], fileName, {
    type: "application/pdf",
  });
  const fd = new FormData();
  fd.append("file", file);
  if (projectId !== undefined) fd.append("projectId", String(projectId));
  return fd;
}

function makeRequest(token: string, formData: FormData) {
  return new NextRequest(`http://localhost/api/portal/${token}/files/upload`, {
    method: "POST",
    body: formData,
  });
}

function mockSelectChain(results: unknown[]) {
  const mockLimit = jest.fn().mockResolvedValue(results);
  const mockWhere = jest.fn(() => ({ limit: mockLimit }));
  const mockFrom = jest.fn(() => ({ where: mockWhere }));
  (db.select as jest.Mock).mockReturnValueOnce({ from: mockFrom });
  return { mockLimit, mockWhere, mockFrom };
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

  describe("project resolution", () => {
    it("returns 400 when client has no projects and no projectId supplied", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([]); // no projects found

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/no projects/i);
    });

    it("returns 403 when supplied projectId does not belong to client", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([]); // project ownership check → empty

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

      const mockReturning = jest.fn().mockResolvedValue([mockInsertedFile]);
      const mockValues = jest.fn(() => ({ returning: mockReturning }));
      (db.insert as jest.Mock).mockReturnValueOnce({ values: mockValues });

      const req = makeRequest("valid-token", makeFormData());
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(mockInsertedFile.id);
      expect(json.name).toBe(mockInsertedFile.name);
      expect(json.projectId).toBe(mockProject.id);
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it("uploads file and returns 201 when projectId is explicitly supplied", async () => {
      mockSelectChain([mockToken]); // token
      mockSelectChain([{ id: 10 }]); // client
      mockSelectChain([{ id: mockProject.id }]); // ownership check

      const mockReturning = jest.fn().mockResolvedValue([mockInsertedFile]);
      const mockValues = jest.fn(() => ({ returning: mockReturning }));
      (db.insert as jest.Mock).mockReturnValueOnce({ values: mockValues });

      const fd = makeFormData("doc.pdf", 512, mockProject.id);
      const req = makeRequest("valid-token", fd);
      const res = await POST(req, { params: makeParams("valid-token") });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.projectId).toBe(mockProject.id);
    });
  });
});
