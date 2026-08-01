import {
  deleteCase,
  addFileMetadata,
  createCase,
  addCaseNotes,
  changeCaseStatus,
  updateCase,
  deleteCaseFile,
  getCasesWithStats,
  getCaseSummary,
  downloadCaseFile,
} from "@/lib/workspace/cases";
import { getCurrentUser } from "@/lib/supabase/auth";
import { assertCanAddFile } from "@/lib/plan_limits";
import { canonicalCaseRow, makeFakeCasesDb } from "../fakes/fake_cases_db";
import { canonicalClientRow } from "../fakes/fake_clients_db";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";
import { makeFakeBillingDb } from "../fakes/fake_billing_db";
import { makeFakePlanLimitsDb } from "../fakes/fake_plan_limits_db";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

vi.mock("@/lib/plan_limits", () => ({
  assertCanAddCase: vi.fn().mockResolvedValue(undefined),
  assertCanAddFile: vi.fn().mockResolvedValue(undefined),
}));

const casesDb = makeFakeCasesDb();
const storage = makeFakeStorageClient();
const billingDb = makeFakeBillingDb();
const planLimitsDb = makeFakePlanLimitsDb();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue(mockUser);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── getCasesWithStats ────────────────────────────────────────────────────

describe("getCasesWithStats", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getCasesWithStats(casesDb)).rejects.toThrow("Unauthorized");
  });

  it("computes per-case completion stats", async () => {
    const result = await getCasesWithStats(casesDb);

    expect(result.cases).toEqual([
      expect.objectContaining({
        id: 5,
        name: "Estate Case",
        stats: { totalTasks: 2, completedTasks: 1, percentage: 50 },
      }),
    ]);
    expect(result.allClients).toEqual([]);
  });

  it("reports 0% for a case without tasks", async () => {
    casesDb.getCasesWithStats.mockResolvedValueOnce([
      {
        id: 6,
        name: "Empty Case",
        description: null,
        status: "active",
        dueDate: null,
        priority: "low",
        clientId: null,
        userId: "user_1",
        clientName: null,
        totalTasks: 0,
        completedTasks: 0,
      },
    ]);

    const result = await getCasesWithStats(casesDb);

    expect(result.cases[0].stats).toEqual({
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
    });
  });
});

// ─── getCaseSummary ───────────────────────────────────────────────────────

describe("getCaseSummary", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getCaseSummary(5, casesDb)).rejects.toThrow("Unauthorized");
  });

  it("returns the case summary row", async () => {
    await expect(getCaseSummary(5, casesDb)).resolves.toEqual(
      expect.objectContaining({ id: 5, name: "Estate Case" })
    );
  });

  it("returns null when the case does not exist", async () => {
    casesDb.getCaseSummary.mockResolvedValueOnce([]);
    await expect(getCaseSummary(99, casesDb)).resolves.toBeNull();
  });
});

// ─── downloadCaseFile ─────────────────────────────────────────────────────

describe("downloadCaseFile", () => {
  it("returns null when the file is not found", async () => {
    casesDb.getCaseFileById.mockResolvedValueOnce([]);
    await expect(downloadCaseFile(99, casesDb, storage)).resolves.toBeNull();
    expect(storage.downloadFile).not.toHaveBeenCalled();
  });

  it("downloads the file body from storage", async () => {
    storage.downloadFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

    const result = await downloadCaseFile(7, casesDb, storage);

    expect(storage.downloadFile).toHaveBeenCalledWith(
      "projectFiles",
      "projects/user_1/contract.pdf"
    );
    expect(result).toEqual({
      body: new Uint8Array([1, 2, 3]),
      name: "contract.pdf",
      mimeType: "application/pdf",
    });
  });
});

// ─── deleteCase ────────────────────────────────────────────────────────

describe("deleteCase", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteCase(1, casesDb, storage)).rejects.toThrow("No user");
  });

  it("cascades the delete with zero storage reduction when no files exist", async () => {
    await deleteCase(5, casesDb, storage);

    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(casesDb.deleteCaseCascade).toHaveBeenCalledWith(5, "user_1", 0);
  });

  it("deletes files from storage and passes the total size to the cascade", async () => {
    casesDb.getCaseFilePaths.mockResolvedValueOnce([
      { path: "projects/user_1/file1.pdf", size: 1000 },
      { path: "projects/user_1/file2.pdf", size: 2000 },
    ]);

    await deleteCase(5, casesDb, storage);

    expect(storage.deleteFile).toHaveBeenCalledTimes(2);
    expect(storage.deleteFile).toHaveBeenCalledWith(
      "projectFiles",
      "projects/user_1/file1.pdf"
    );
    expect(casesDb.deleteCaseCascade).toHaveBeenCalledWith(5, "user_1", 3000);
  });
});

// ─── addFileMetadata ──────────────────────────────────────────────────────

describe("addFileMetadata", () => {
  const makeFormData = (name = "test.pdf", size = 100): FormData => {
    const file = {
      name,
      size,
      type: "application/pdf",
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(size)),
    } as unknown as File;
    return { get: vi.fn().mockReturnValue(file) } as unknown as FormData;
  };

  const callAddFileMetadata = (formData: FormData) =>
    addFileMetadata(
      { caseId: 1 },
      formData,
      casesDb,
      storage,
      planLimitsDb,
      billingDb
    );

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(callAddFileMetadata(makeFormData())).rejects.toThrow(
      "No user"
    );
  });

  it("throws storage limit error and skips upload when assertCanAddFile rejects", async () => {
    (assertCanAddFile as Mock).mockRejectedValueOnce(
      new Error("Storage limit reached")
    );
    await expect(callAddFileMetadata(makeFormData())).rejects.toThrow(
      "Storage limit reached"
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("throws when storage upload throws", async () => {
    storage.uploadFile.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(callAddFileMetadata(makeFormData())).rejects.toThrow(
      "Failed to upload file"
    );
    expect(casesDb.insertCaseFileWithStorage).not.toHaveBeenCalled();
  });

  it("throws 404 when caseId does not belong to the user", async () => {
    casesDb.getCaseById.mockResolvedValueOnce([]);
    await expect(callAddFileMetadata(makeFormData())).rejects.toThrow(
      "Case not found"
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("inserts metadata and returns { path, name, size } on success", async () => {
    const result = await callAddFileMetadata(makeFormData("doc.pdf", 2048));

    expect(result).toMatchObject({ name: "doc.pdf", size: 2048 });
    expect(result!.path).toContain("doc.pdf");
    expect(casesDb.insertCaseFileWithStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 1,
        userId: "user_1",
        name: "doc.pdf",
        size: 2048,
        mimeType: "application/pdf",
      })
    );
  });

  it("cleans up the uploaded file when the DB write fails", async () => {
    casesDb.insertCaseFileWithStorage.mockRejectedValueOnce(
      new Error("db down")
    );

    await expect(
      callAddFileMetadata(makeFormData("orphan.pdf", 10))
    ).rejects.toThrow("Failed to save file metadata");

    expect(storage.deleteFile).toHaveBeenCalledTimes(1);
    expect(storage.deleteFile).toHaveBeenCalledWith(
      "projectFiles",
      expect.stringContaining("orphan.pdf")
    );
  });
});

// ─── createCase ────────────────────────────────────────────────────────

describe("createCase", () => {
  const baseCase = {
    id: 99,
    name: "My Case",
    description: "A case",
    status: "active",
    userId: "",
  };

  const callCreateCase = (aCase: unknown) =>
    createCase(aCase as never, casesDb, planLimitsDb, billingDb);

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(callCreateCase(baseCase)).rejects.toThrow("Unauthorized");
  });

  it("throws when name is an empty string", async () => {
    await expect(callCreateCase({ ...baseCase, name: "" })).rejects.toThrow(
      "name is required"
    );
    expect(casesDb.insertCase).not.toHaveBeenCalled();
  });

  it("throws when name is whitespace only", async () => {
    await expect(callCreateCase({ ...baseCase, name: "   " })).rejects.toThrow(
      "name is required"
    );
    expect(casesDb.insertCase).not.toHaveBeenCalled();
  });

  it("inserts case (without id field) and returns it with default stats", async () => {
    const result = await callCreateCase(baseCase);

    expect(casesDb.insertCase).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.anything() })
    );
    expect(result.stats).toEqual({
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
    });
  });

  it("trims surrounding whitespace from the name before inserting", async () => {
    await callCreateCase({ ...baseCase, name: "  My Case  " });

    expect(casesDb.insertCase).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Case" })
    );
  });

  it("inserts with no clientId when neither clientId nor clientName is given", async () => {
    await callCreateCase(baseCase);

    expect(casesDb.getClientByName).not.toHaveBeenCalled();
    expect(casesDb.insertCase).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: undefined })
    );
  });

  it("uses clientId directly when provided", async () => {
    await callCreateCase({ ...baseCase, clientId: 3 });

    expect(casesDb.getClientByName).not.toHaveBeenCalled();
    expect(casesDb.insertCase).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 3 })
    );
  });

  it("resolves clientId from clientName when clientId is not given", async () => {
    casesDb.getClientByName.mockResolvedValueOnce([
      { ...canonicalClientRow, id: 8 },
    ]);

    await callCreateCase({ ...baseCase, clientName: "Jane Client" });

    expect(casesDb.getClientByName).toHaveBeenCalledWith(
      "user_1",
      "Jane Client"
    );
    expect(casesDb.insertCase).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 8 })
    );
  });

  it("throws Validation error when no client found via getClientByName", async () => {
    casesDb.getClientByName.mockResolvedValueOnce([]);

    await expect(
      callCreateCase({ ...baseCase, clientName: "Nobody" })
    ).rejects.toThrow("No client found");
    expect(casesDb.insertCase).not.toHaveBeenCalled();
  });
});

// ─── addCaseNotes ──────────────────────────────────────────────────────

describe("addCaseNotes", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(addCaseNotes("Note content", 1, casesDb)).rejects.toThrow(
      "No user"
    );
  });

  it("throws 404 when caseId does not belong to the user", async () => {
    casesDb.getCaseById.mockResolvedValueOnce([]);
    await expect(addCaseNotes("Note content", 1, casesDb)).rejects.toThrow(
      "Case not found"
    );
    expect(casesDb.insertCaseNote).not.toHaveBeenCalled();
  });

  it("inserts the note for the current user", async () => {
    await addCaseNotes("Note content", 1, casesDb);
    expect(casesDb.insertCaseNote).toHaveBeenCalledWith(
      "Note content",
      "user_1",
      1
    );
  });
});

// ─── updateCase ────────────────────────────────────────────────────────

describe("updateCase", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateCase({ id: 1, name: "X" }, casesDb)).rejects.toThrow(
      "No user"
    );
  });

  it("does nothing when no fields provided", async () => {
    await updateCase({ id: 1 }, casesDb);
    expect(casesDb.updateCase).not.toHaveBeenCalled();
  });

  it("throws when neither id nor caseName is provided", async () => {
    await expect(updateCase({ name: "New Name" }, casesDb)).rejects.toThrow(
      "id or caseName is required"
    );
    expect(casesDb.updateCase).not.toHaveBeenCalled();
  });

  it("throws Validation error when no case found via getCaseByName", async () => {
    casesDb.getCaseByName.mockResolvedValueOnce([]);
    await expect(
      updateCase({ caseName: "Nobody's Case", priority: "high" }, casesDb)
    ).rejects.toThrow("No case found");
    expect(casesDb.updateCase).not.toHaveBeenCalled();
  });

  it("looks up the case by caseName when id is not provided", async () => {
    casesDb.getCaseByName.mockResolvedValueOnce([
      { ...canonicalCaseRow, id: 9 },
    ]);
    await updateCase({ caseName: "Estate Case", priority: "high" }, casesDb);
    expect(casesDb.getCaseByName).toHaveBeenCalledWith("user_1", "Estate Case");
    expect(casesDb.updateCase).toHaveBeenCalledWith(9, "user_1", {
      priority: "high",
    });
  });

  it("updates provided fields with correct where clause", async () => {
    await updateCase({ id: 3, name: "New Name", priority: "high" }, casesDb);
    expect(casesDb.updateCase).toHaveBeenCalledWith(
      3,
      "user_1",
      expect.objectContaining({ name: "New Name", priority: "high" })
    );
  });

  it("updates all optional fields when provided", async () => {
    await updateCase(
      {
        id: 2,
        name: "P",
        description: "D",
        status: "completed",
        dueDate: "2026-12-31",
        priority: "low",
      },
      casesDb
    );
    expect(casesDb.updateCase).toHaveBeenCalledWith(2, "user_1", {
      name: "P",
      description: "D",
      status: "completed",
      dueDate: "2026-12-31",
      priority: "low",
    });
  });
});

// ─── deleteCaseFile ────────────────────────────────────────────────────

describe("deleteCaseFile", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteCaseFile(1, casesDb, storage)).rejects.toThrow(
      "No user"
    );
  });

  it("throws when file not found", async () => {
    casesDb.getCaseFileById.mockResolvedValueOnce([]);
    await expect(deleteCaseFile(99, casesDb, storage)).rejects.toThrow(
      "File not found"
    );
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it("deletes from storage and DB on success", async () => {
    await deleteCaseFile(7, casesDb, storage);

    expect(storage.deleteFile).toHaveBeenCalledWith(
      "projectFiles",
      "projects/user_1/contract.pdf"
    );
    expect(casesDb.deleteCaseFileWithStorage).toHaveBeenCalledWith(
      7,
      "user_1",
      100
    );
  });

  it("does not delete from DB if storage throws", async () => {
    storage.deleteFile.mockRejectedValueOnce(new Error("Storage error"));

    await expect(deleteCaseFile(7, casesDb, storage)).rejects.toThrow(
      "Storage error"
    );
    expect(casesDb.deleteCaseFileWithStorage).not.toHaveBeenCalled();
  });
});

// ─── changeCaseStatus ──────────────────────────────────────────────────

describe("changeCaseStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      changeCaseStatus({ id: 1 } as never, "completed", casesDb)
    ).rejects.toThrow("No user");
  });

  it("updates the status with the correct scope", async () => {
    await changeCaseStatus({ id: 3 } as never, "completed", casesDb);
    expect(casesDb.updateCase).toHaveBeenCalledWith(3, "user_1", {
      status: "completed",
    });
  });
});
