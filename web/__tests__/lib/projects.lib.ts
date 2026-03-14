import {
  deleteProject,
  addFileMetadata,
  createProject,
  addNotes,
  changeProjectStatus,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockS3Send = (require("@/lib/s3").s3.send) as jest.Mock;

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

  it("returns early (no upload) when user already has 3 or more files", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{}, {}, {}]); // 3 existing files
    const result = await addFileMetadata({ projectId: 1 }, makeFile());
    expect(mockS3Send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("throws when S3 upload throws", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([]); // 0 existing files
    mockS3Send.mockRejectedValueOnce(new Error("Upload failed"));
    await expect(addFileMetadata({ projectId: 1 }, makeFile())).rejects.toThrow(
      "Failed to upload file"
    );
  });

  it("inserts metadata and returns { path, name, size } on success", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([]); // 0 existing files
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

// ─── addNotes ─────────────────────────────────────────────────────────────

describe("addNotes", () => {
  it("throws when unauthenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);
    await expect(addNotes("Note content", 1)).rejects.toThrow("No user");
  });

  it("inserts note and returns the created record", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    const noteRecord = {
      id: 1,
      content: "Note content",
      projectId: 5,
      userId: "user_1",
    };
    mockReturning.mockResolvedValueOnce([noteRecord]);

    const result = await addNotes("Note content", 5);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Note content",
        projectId: 5,
        userId: "user_1",
      })
    );
    expect(result).toEqual(noteRecord);
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
