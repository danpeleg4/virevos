import {
  changeRecordingStatus,
  ensureUserRow,
  uploadAvatar,
  getAvatarUrl,
} from "@/lib/user";
import { getCurrentUser } from "@/lib/supabase/auth";
import { uploadFile, getSignedUrl, deleteFile } from "@/lib/storage";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  getSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
}));

const mockUpdateWhere = vi.fn();
const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));
const mockOnConflictDoNothing = vi.fn();
const mockInsertValues = vi.fn(() => ({
  onConflictDoNothing: mockOnConflictDoNothing,
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("@db/db", () => ({
  db: {
    // eslint-disable-next-line prefer-spread
    select: (...args: never[]) => mockSelect.apply(null, args),
    update: vi.fn(() => ({ set: mockSet })),
    // eslint-disable-next-line prefer-spread
    insert: (...args: never[]) => mockInsert.apply(null, args),
  },
}));

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  mockUpdateWhere.mockResolvedValue(undefined);
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  mockSelectWhere.mockResolvedValue([{ recordingStatus: false }]);
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelect.mockReturnValue({ from: mockSelectFrom });
  mockOnConflictDoNothing.mockResolvedValue(undefined);
  mockInsertValues.mockReturnValue({
    onConflictDoNothing: mockOnConflictDoNothing,
  });
  mockInsert.mockReturnValue({ values: mockInsertValues });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ─── changeRecordingStatus ────────────────────────────────────────────────

describe("changeRecordingStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changeRecordingStatus()).rejects.toThrow("No user");
  });

  it("sets recordingStatus to false when it was true", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: true }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: false });
  });

  it("sets recordingStatus to true when it was false", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ recordingStatus: false }]);
    await changeRecordingStatus();
    expect(mockSet).toHaveBeenCalledWith({ recordingStatus: true });
  });

  it("silently swallows errors (does not re-throw)", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockRejectedValueOnce(new Error("DB error"));
    await changeRecordingStatus(); // should not throw
  });
});

// ─── ensureUserRow ────────────────────────────────────────────────────────

describe("ensureUserRow", () => {
  it("does nothing when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await ensureUserRow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("inserts a row with user data from the session", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "test@example.com",
      user_metadata: { name: "Test User" },
    });

    await ensureUserRow();

    expect(mockInsertValues).toHaveBeenCalledWith({
      user_id: "user_1",
      email: "test@example.com",
      name: "Test User",
    });
    expect(mockOnConflictDoNothing).toHaveBeenCalled();
  });

  it("falls back to empty strings when email/name are missing", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    await ensureUserRow();

    expect(mockInsertValues).toHaveBeenCalledWith({
      user_id: "user_1",
      email: "",
      name: "",
    });
  });

  it("propagates DB errors", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "x@y.com",
    });
    mockOnConflictDoNothing.mockRejectedValueOnce(new Error("DB down"));

    await expect(ensureUserRow()).rejects.toThrow("DB down");
  });
});

// ─── uploadAvatar ─────────────────────────────────────────────────────────

function makeFormData(file?: unknown): FormData {
  const fd = new FormData();
  if (file !== undefined) fd.append("file", file as Blob);
  return fd;
}

function makeImage(type = "image/png", size = 1024): File {
  const file = new File([new Uint8Array(size)], "avatar.png", { type });
  // jsdom/node File reports size from contents; assert our assumption holds.
  return file;
}

describe("uploadAvatar", () => {
  beforeEach(() => {
    (getSignedUrl as Mock).mockResolvedValue("https://cdn/signed-url");
    (uploadFile as Mock).mockResolvedValue(undefined);
    (deleteFile as Mock).mockResolvedValue(undefined);
    // No previous avatar by default.
    mockSelectWhere.mockResolvedValue([{ avatarPath: null }]);
  });

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(uploadAvatar(makeFormData(makeImage()))).rejects.toThrow(
      "No user"
    );
  });

  it("rejects when no file is provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(uploadAvatar(makeFormData())).rejects.toThrow(
      "An image file is required"
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await expect(uploadAvatar(makeFormData(pdf))).rejects.toThrow(
      "Unsupported image type"
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("rejects files larger than 2MB", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const big = makeImage("image/png", 2 * 1024 * 1024 + 1);
    await expect(uploadAvatar(makeFormData(big))).rejects.toThrow(
      "Image must be 2MB or smaller"
    );
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("uploads to the users bucket, persists the path, and returns a signed URL", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const result = await uploadAvatar(makeFormData(makeImage()));

    expect(uploadFile).toHaveBeenCalledTimes(1);
    const [bucket, path, body, contentType] = (uploadFile as Mock).mock
      .calls[0];
    expect(bucket).toBe("users");
    expect(path).toMatch(/^user_1\/avatar-\d+\.png$/);
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(contentType).toBe("image/png");

    expect(mockSet).toHaveBeenCalledWith({ avatarPath: path });
    expect(getSignedUrl).toHaveBeenCalledWith("users", path, 60 * 60);
    expect(result).toEqual({ url: "https://cdn/signed-url" });
  });

  it("deletes the previous avatar after a successful upload", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-old.png" },
    ]);

    await uploadAvatar(makeFormData(makeImage()));

    expect(deleteFile).toHaveBeenCalledWith("users", "user_1/avatar-old.png");
  });

  it("still succeeds if deleting the previous avatar fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-old.png" },
    ]);
    (deleteFile as Mock).mockRejectedValueOnce(new Error("delete boom"));

    const result = await uploadAvatar(makeFormData(makeImage()));
    expect(result).toEqual({ url: "https://cdn/signed-url" });
  });
});

// ─── getAvatarUrl ─────────────────────────────────────────────────────────

describe("getAvatarUrl", () => {
  beforeEach(() => {
    (getSignedUrl as Mock).mockResolvedValue("https://cdn/signed-url");
  });

  it("returns null when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getAvatarUrl()).resolves.toEqual({ url: null });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null when the user has no avatar", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ avatarPath: null }]);
    await expect(getAvatarUrl()).resolves.toEqual({ url: null });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL for the stored avatar path", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-123.png" },
    ]);
    await expect(getAvatarUrl()).resolves.toEqual({
      url: "https://cdn/signed-url",
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      "users",
      "user_1/avatar-123.png",
      60 * 60
    );
  });
});
