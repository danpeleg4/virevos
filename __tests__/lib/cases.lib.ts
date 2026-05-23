import {
  deleteCase,
  addFileMetadata,
  createCase,
  addCaseNotes,
  changeCaseStatus,
  updateCase,
  deleteCaseFile,
} from "@/lib/workspace/cases";
import { getCurrentUser } from "@/lib/supabase/auth";
import { assertCanAddFile } from "@/lib/plan_limits";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockDeleteWhere = vi.fn();
const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("@db/db", () => {
  const dbMock = {
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    transaction: vi.fn(),
  };
  // Run the transaction callback with the same db mock so tx.delete etc. flow
  // through the same mocks as direct db.* calls.
  dbMock.transaction.mockImplementation((cb: (tx: typeof dbMock) => unknown) =>
    cb(dbMock)
  );
  return { db: dbMock };
});

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

// eslint-disable-next-line no-var
var mockUploadFile: Mock;
// eslint-disable-next-line no-var
var mockDeleteFile: Mock;

vi.mock("@/lib/storage", () => {
  mockUploadFile = vi.fn();
  mockDeleteFile = vi.fn();
  return { uploadFile: mockUploadFile, deleteFile: mockDeleteFile };
});

vi.mock("@/lib/plan_limits", () => ({
  assertCanAddCase: vi.fn().mockResolvedValue(undefined),
  assertCanAddFile: vi.fn().mockResolvedValue(undefined),
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockDeleteWhere.mockResolvedValue(undefined);
  mockUpdateWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue([]);
  mockSelectWhere.mockResolvedValue([]);
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── deleteCase ────────────────────────────────────────────────────────

describe("deleteCase", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(deleteCase(1)).rejects.toThrow("No user");
  });

  it("calls db.delete four times (caseFiles, tasks, notes, cases) when no files exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValue([]);
    await deleteCase(5);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(4);
  });

  it("deletes files from storage and decrements storage counter when files exist", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValue([
      { path: "projects/user_1/file1.pdf", size: 1000 },
      { path: "projects/user_1/file2.pdf", size: 2000 },
    ]);
    await deleteCase(5);
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenCalledWith(
      "projectFiles",
      "projects/user_1/file1.pdf"
    );
    expect(mockDeleteFile).toHaveBeenCalledWith(
      "projectFiles",
      "projects/user_1/file2.pdf"
    );
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ storage: expect.anything() })
    );
  });

  it("does not update storage counter when case has no files", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValue([]);
    await deleteCase(5);
    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
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

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      addFileMetadata({ caseId: 1 }, makeFormData())
    ).rejects.toThrow("No user");
  });

  it("throws storage limit error and skips upload when assertCanAddFile rejects", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    (assertCanAddFile as Mock).mockRejectedValueOnce(
      new Error("Storage limit reached")
    );
    await expect(
      addFileMetadata({ caseId: 1 }, makeFormData())
    ).rejects.toThrow("Storage limit reached");
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("throws when storage upload throws", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockUploadFile.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(
      addFileMetadata({ caseId: 1 }, makeFormData())
    ).rejects.toThrow("Failed to upload file");
  });

  it("inserts metadata and returns { path, name, size } on success", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockUploadFile.mockResolvedValueOnce(undefined);

    const result = await addFileMetadata(
      { caseId: 1 },
      makeFormData("doc.pdf", 2048)
    );

    expect(result).toMatchObject({ name: "doc.pdf", size: 2048 });
    expect(result!.path).toContain("doc.pdf");
  });

  it("cleans up the uploaded file when the DB write fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockUploadFile.mockResolvedValueOnce(undefined);
    // Force the insert inside the transaction to reject.
    mockValues.mockImplementationOnce(() => {
      throw new Error("db down");
    });

    await expect(
      addFileMetadata({ caseId: 1 }, makeFormData("orphan.pdf", 10))
    ).rejects.toThrow("Failed to save file metadata");

    expect(mockDeleteFile).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).toHaveBeenCalledWith(
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

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(createCase(baseCase as never)).rejects.toThrow("Unauthorized");
  });

  it("throws when name is an empty string", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      createCase({ ...baseCase, name: "" } as never)
    ).rejects.toThrow("name is required");
    expect(mockValues).not.toHaveBeenCalled();
  });

  it("throws when name is whitespace only", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      createCase({ ...baseCase, name: "   " } as never)
    ).rejects.toThrow("name is required");
    expect(mockValues).not.toHaveBeenCalled();
  });

  it("inserts case (without id field) and returns it with default stats", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const dbRecord = {
      name: "My Case",
      description: "A case",
      status: "active",
      userId: "user_1",
    };
    mockReturning.mockResolvedValueOnce([dbRecord]);

    const result = await createCase(baseCase as never);

    expect(mockValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.anything() })
    );
    expect(result.stats).toEqual({
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
    });
  });

  it("trims surrounding whitespace from the name before inserting", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockReturning.mockResolvedValueOnce([{ name: "My Case" }]);

    await createCase({ ...baseCase, name: "  My Case  " } as never);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: "My Case" })
    );
  });
});

// ─── addCaseNotes ──────────────────────────────────────────────────────

describe("addCaseNotes", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(addCaseNotes("Note content", 1)).rejects.toThrow("No user");
  });
});

// ─── updateCase ────────────────────────────────────────────────────────

describe("updateCase", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateCase({ id: 1, name: "X" })).rejects.toThrow("No user");
  });

  it("does nothing when no fields provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateCase({ id: 1 });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateCase({ id: 3, name: "New Name", priority: "high" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Name", priority: "high" })
    );
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("updates all optional fields when provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await updateCase({
      id: 2,
      name: "P",
      description: "D",
      status: "completed",
      dueDate: "2026-12-31",
      priority: "low",
    });
    expect(mockSet).toHaveBeenCalledWith({
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
    await expect(deleteCaseFile(1)).rejects.toThrow("No user");
  });

  it("throws when file not found", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([]);
    await expect(deleteCaseFile(99)).rejects.toThrow("File not found");
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("deletes from storage and DB on success", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      { path: "cases/user_1/file.pdf", size: 100 },
    ]);
    mockDeleteFile.mockResolvedValueOnce(undefined);

    await deleteCaseFile(5);

    expect(mockDeleteFile).toHaveBeenCalledTimes(1);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("does not delete from DB if storage throws", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      { path: "cases/user_1/file.pdf", size: 100 },
    ]);
    mockDeleteFile.mockRejectedValueOnce(new Error("Storage error"));

    await expect(deleteCaseFile(5)).rejects.toThrow("Storage error");
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });
});

// ─── changeCaseStatus ──────────────────────────────────────────────────

describe("changeCaseStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      changeCaseStatus({ id: 1 } as never, "completed")
    ).rejects.toThrow("No user");
  });

  it("calls db.update().set({ status: newStatus }) with correct where clause", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await changeCaseStatus({ id: 3 } as never, "completed");
    expect(mockSet).toHaveBeenCalledWith({ status: "completed" });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});
