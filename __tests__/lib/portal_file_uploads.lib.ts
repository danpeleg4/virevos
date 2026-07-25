import { uploadPortalFile } from "@/lib/portal/portal_file_uploads";
import {
  canonicalUploadsPortalToken,
  makeFakePortalUploadsDb,
} from "../fakes/fake_portal_uploads_db";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: () => null })),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

const portalUploadsDb = makeFakePortalUploadsDb();
const storage = makeFakeStorageClient();
const planLimitsDb = makeFakePlanLimitsDb();
const billingDb = makeFakeBillingDb();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

function makeFormData(
  fileName = "test.pdf",
  fileSizeBytes = 1024,
  caseId?: number
) {
  const fd = new FormData();
  const file = new File(["x".repeat(fileSizeBytes)], fileName, {
    type: "application/pdf",
  });
  fd.append("file", file);
  if (caseId !== undefined) fd.append("caseId", String(caseId));
  return fd;
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  await expect(promise).rejects.toMatchObject({ status });
}

const upload = (token: string, formData: FormData) =>
  uploadPortalFile(
    token,
    formData,
    portalUploadsDb,
    storage,
    planLimitsDb,
    billingDb
  );

describe("uploadPortalFile", () => {
  describe("token validation", () => {
    it("throws 404 when token not found", async () => {
      portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([]);
      await expectStatus(upload("bad-token", makeFormData()), 404);
    });

    it("throws 404 when portal is disabled", async () => {
      portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([
        { ...canonicalUploadsPortalToken, enabled: false },
      ]);
      await expectStatus(upload("valid-token", makeFormData()), 404);
    });
  });

  describe("fileSharing setting", () => {
    it("throws 403 when fileSharing is explicitly disabled", async () => {
      portalUploadsDb.getPortalTokenByToken.mockResolvedValueOnce([
        { ...canonicalUploadsPortalToken, settings: { fileSharing: false } },
      ]);
      await expect(upload("valid-token", makeFormData())).rejects.toMatchObject(
        { status: 403, message: /file sharing/i }
      );
    });
  });

  describe("file validation", () => {
    it("throws 400 when no file is provided", async () => {
      const fd = new FormData(); // no file
      await expect(upload("valid-token", fd)).rejects.toMatchObject({
        status: 400,
        message: /no file/i,
      });
    });

    it("throws 400 when file exceeds 10 MB", async () => {
      const oversizedBytes = 11 * 1024 * 1024;
      await expect(
        upload("valid-token", makeFormData("big.pdf", oversizedBytes))
      ).rejects.toMatchObject({ status: 400, message: /10 MB/i });
    });
  });

  describe("case resolution", () => {
    it("throws 400 when client has no cases and no caseId supplied", async () => {
      portalUploadsDb.getFirstCaseForClient.mockResolvedValueOnce([]);
      await expect(upload("valid-token", makeFormData())).rejects.toMatchObject(
        { status: 400, message: /no cases/i }
      );
    });

    it("throws 403 when supplied caseId does not belong to client", async () => {
      portalUploadsDb.getCaseForClient.mockResolvedValueOnce([]);
      await expect(
        upload("valid-token", makeFormData("doc.pdf", 512, 999))
      ).rejects.toMatchObject({ status: 403, message: /does not belong/i });
    });
  });

  describe("successful upload", () => {
    it("uploads file and returns metadata (auto case)", async () => {
      const result = await upload("valid-token", makeFormData());

      expect(result.caseId).toBe(5);
      expect(storage.uploadFile).toHaveBeenCalledTimes(1);
      expect(portalUploadsDb.insertCaseFileWithStorage).toHaveBeenCalledTimes(
        1
      );
      expect(portalUploadsDb.insertCaseFileWithStorage).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 5, userId: "user_1" })
      );
      expect(storage.deleteFile).not.toHaveBeenCalled();
    });

    it("uploads file when caseId is explicitly supplied", async () => {
      portalUploadsDb.getCaseForClient.mockResolvedValueOnce([{ id: 7 }]);

      const result = await upload(
        "valid-token",
        makeFormData("doc.pdf", 512, 7)
      );

      expect(result.caseId).toBe(7);
      expect(portalUploadsDb.insertCaseFileWithStorage).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 7 })
      );
    });
  });

  describe("storage quota", () => {
    it("rejects and skips upload when storage limit is exceeded", async () => {
      planLimitsDb.getStorage.mockResolvedValueOnce([
        { storage: 250 * 1024 * 1024 * 1024 },
      ]);

      await expect(upload("valid-token", makeFormData())).rejects.toThrow(
        /storage limit/i
      );
      expect(storage.uploadFile).not.toHaveBeenCalled();
      expect(portalUploadsDb.insertCaseFileWithStorage).not.toHaveBeenCalled();
    });
  });

  describe("orphan cleanup", () => {
    it("deletes uploaded file when DB insert fails", async () => {
      portalUploadsDb.insertCaseFileWithStorage.mockRejectedValueOnce(
        new Error("boom")
      );

      await expect(upload("valid-token", makeFormData())).rejects.toThrow(
        /boom/
      );
      expect(storage.uploadFile).toHaveBeenCalledTimes(1);
      expect(storage.deleteFile).toHaveBeenCalledTimes(1);

      const uploadedPath = storage.uploadFile.mock.calls[0][1];
      const deletedPath = storage.deleteFile.mock.calls[0][1];
      expect(deletedPath).toBe(uploadedPath);
    });

    it("still rejects if cleanup itself fails", async () => {
      portalUploadsDb.insertCaseFileWithStorage.mockRejectedValueOnce(
        new Error("db down")
      );
      storage.deleteFile.mockRejectedValueOnce(new Error("storage also down"));

      await expect(upload("valid-token", makeFormData())).rejects.toThrow(
        /db down/
      );
      expect(storage.deleteFile).toHaveBeenCalledTimes(1);
    });
  });
});
