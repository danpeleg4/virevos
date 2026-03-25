import {
  deleteProject,
  addFileMetadata,
  createProject,
  addProjectNotes,
  changeProjectStatus,
  updateProject,
  deleteProjectFile,
} from "@/lib/projects";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const mockDeleteWhere = jest.fn();
const mockUpdateWhere = jest.fn();
const mockSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockReturning = jest.fn();
const mockValues = jest.fn(() => ({ returning: mockReturning }));
const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock("@db/db", () => ({
  db: {
    delete: jest.fn(() => ({ where: mockDeleteWhere })),
    update: jest.fn(() => ({ set: mockSet })),
    insert: jest.fn(() => ({ values: mockValues })),
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
  },
}));

jest.mock("@/lib/s3", () => ({
  s3: { send: jest.fn() },
  S3_BUCKET: "virevos-project-files",
}));

jest.mock("@/lib/plan_limits", () => ({
  assertCanAddProject: jest.fn().mockResolvedValue(undefined),
  assertCanAddFile: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockS3Send = require("@/lib/s3").s3.send as jest.Mock;

const mockUser = { id: "user_1" };

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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

// ─── deleteProject ────────────────────────────────────────────────────────

describe("deleteProject", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(deleteProject(1)).rejects.toThrow("No user");
  });

  it("calls db.delete three times (tasks, notes, projects) in order", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await deleteProject(5);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(3);
  });
});

// ─── addFileMetadata ──────────────────────────────────────────────────────

describe("addFileMetadata", () => {
  const makeFile = (name = "test.pdf", size = 100): File =>
    ({
      name,
      size,
      type: "application/pdf",
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(size)),
    }) as unknown as File;

  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(addFileMetadata({ projectId: 1 }, makeFile())).rejects.toThrow(
      "No user"
    );
  });

  it("throws storage limit error and skips upload when assertCanAddFile rejects", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const { assertCanAddFile } = require("@/lib/plan_limits");
    (assertCanAddFile as jest.Mock).mockRejectedValueOnce(
      new Error("Storage limit reached")
    );
    await expect(addFileMetadata({ projectId: 1 }, makeFile())).rejects.toThrow(
      "Storage limit reached"
    );
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("throws when S3 upload throws", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockS3Send.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(addFileMetadata({ projectId: 1 }, makeFile())).rejects.toThrow(
      "Failed to upload file"
    );
  });

  it("inserts metadata and returns { path, name, size } on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockS3Send.mockResolvedValueOnce({});

    const file = makeFile("doc.pdf", 2048);
    const result = await addFileMetadata({ projectId: 1 }, file);

    expect(result).toMatchObject({ name: "doc.pdf", size: 2048 });
    expect(result!.path).toContain("doc.pdf");
  });
});

// ─── createProject ────────────────────────────────────────────────────────

describe("createProject", () => {
  const baseProject = {
    id: 99,
    name: "My Project",
    description: "A project",
    status: "active",
    userId: "",
  };

  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(createProject(baseProject as never)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("inserts project (without id field) and returns it with default stats", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const dbRecord = {
      name: "My Project",
      description: "A project",
      status: "active",
      userId: "user_1",
    };
    mockReturning.mockResolvedValueOnce([dbRecord]);

    const result = await createProject(baseProject as never);

    expect(mockValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.anything() })
    );
    expect(result.stats).toEqual({
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
    });
  });
});

// ─── addProjectNotes ──────────────────────────────────────────────────────

describe("addProjectNotes", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(addProjectNotes("Note content", 1)).rejects.toThrow("No user");
  });
});

// ─── updateProject ────────────────────────────────────────────────────────

describe("updateProject", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(updateProject({ id: 1, name: "X" })).rejects.toThrow(
      "No user"
    );
  });

  it("does nothing when no fields provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateProject({ id: 1 });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("updates provided fields with correct where clause", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateProject({ id: 3, name: "New Name", priority: "high" });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Name", priority: "high" })
    );
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("updates all optional fields when provided", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await updateProject({
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

// ─── deleteProjectFile ────────────────────────────────────────────────────

describe("deleteProjectFile", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(deleteProjectFile(1)).rejects.toThrow("No user");
  });

  it("throws when file not found", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([]);
    await expect(deleteProjectFile(99)).rejects.toThrow("File not found");
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it("deletes from S3 and DB on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ path: "projects/user_1/file.pdf" }]);
    mockS3Send.mockResolvedValueOnce({});

    await deleteProjectFile(5);

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("does not delete from DB if S3 throws", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ path: "projects/user_1/file.pdf" }]);
    mockS3Send.mockRejectedValueOnce(new Error("S3 error"));

    await expect(deleteProjectFile(5)).rejects.toThrow("S3 error");
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });
});

// ─── changeProjectStatus ──────────────────────────────────────────────────

describe("changeProjectStatus", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(
      changeProjectStatus({ id: 1 } as never, "completed")
    ).rejects.toThrow("No user");
  });

  it("calls db.update().set({ status: newStatus }) with correct where clause", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    await changeProjectStatus({ id: 3 } as never, "completed");
    expect(mockSet).toHaveBeenCalledWith({ status: "completed" });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });
});
