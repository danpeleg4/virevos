import {
  changeRecordingStatus,
  changePassword,
  ensureUserRow,
  uploadAvatar,
  getAvatarUrl,
  getUserProfile,
  updateProfile,
  getWeeklySummaryPreference,
  updateWeeklySummaryPreference,
} from "@/lib/user";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadFile, getSignedUrl, deleteFile } from "@/lib/storage";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
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
  mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
  (createServerSupabase as Mock).mockResolvedValue({
    auth: {
      updateUser: mockUpdateUser,
      signInWithPassword: mockSignInWithPassword,
    },
  });
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

// ─── changePassword ───────────────────────────────────────────────────────

describe("changePassword", () => {
  const authedUser = { id: "user_1", email: "jane@example.com" };

  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      changePassword({ currentPassword: "oldpass12", newPassword: "newpass12" })
    ).rejects.toThrow("No user");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("throws when the account has no email", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
    await expect(
      changePassword({ currentPassword: "oldpass12", newPassword: "newpass12" })
    ).rejects.toThrow("Account has no email address");
  });

  it("rejects a new password shorter than 8 characters", async () => {
    (getCurrentUser as Mock).mockResolvedValue(authedUser);
    await expect(
      changePassword({ currentPassword: "oldpass12", newPassword: "short" })
    ).rejects.toThrow("newPassword must be at least 8 characters");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("rejects when the new password equals the current one", async () => {
    (getCurrentUser as Mock).mockResolvedValue(authedUser);
    await expect(
      changePassword({ currentPassword: "samepass1", newPassword: "samepass1" })
    ).rejects.toThrow("must be different from the current password");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects when the current password is incorrect", async () => {
    (getCurrentUser as Mock).mockResolvedValue(authedUser);
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    await expect(
      changePassword({ currentPassword: "wrongpass", newPassword: "newpass12" })
    ).rejects.toThrow("Current password is incorrect");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("verifies the current password then updates to the new one", async () => {
    (getCurrentUser as Mock).mockResolvedValue(authedUser);
    await expect(
      changePassword({ currentPassword: "oldpass12", newPassword: "newpass12" })
    ).resolves.toEqual({ success: true });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "jane@example.com",
      password: "oldpass12",
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpass12" });
  });

  it("throws when the password update fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(authedUser);
    mockUpdateUser.mockResolvedValueOnce({
      data: {},
      error: { message: "update boom" },
    });
    await expect(
      changePassword({ currentPassword: "oldpass12", newPassword: "newpass12" })
    ).rejects.toThrow("Failed to update password: update boom");
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

// ─── getUserProfile ───────────────────────────────────────────────────────

describe("getUserProfile", () => {
  const EMPTY = {
    name: "",
    email: "",
    jobTitle: "",
    company: "",
    bio: "",
  };

  it("returns empty fields when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getUserProfile()).resolves.toEqual(EMPTY);
  });

  it("returns all stored profile fields", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([
      {
        name: "Jane Doe",
        email: "jane@example.com",
        jobTitle: "Attorney",
        company: "Virevos LLC",
        bio: "Hello",
      },
    ]);
    await expect(getUserProfile()).resolves.toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      jobTitle: "Attorney",
      company: "Virevos LLC",
      bio: "Hello",
    });
  });

  it("normalizes nulls and falls back to auth metadata/email", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "auth@example.com",
      user_metadata: { name: "Auth Name" },
    });
    mockSelectWhere.mockResolvedValueOnce([
      {
        name: null,
        email: null,
        jobTitle: null,
        company: null,
        bio: null,
      },
    ]);
    await expect(getUserProfile()).resolves.toEqual({
      name: "Auth Name",
      email: "auth@example.com",
      jobTitle: "",
      company: "",
      bio: "",
    });
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateProfile({ name: "Jane" })).rejects.toThrow("No user");
  });

  it("rejects an empty name", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateProfile({ name: "   " })).rejects.toThrow(
      "name is required"
    );
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("trims, persists all fields, and mirrors the name to auth metadata", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "jane@example.com",
    });

    const result = await updateProfile({
      name: "  Jane Doe  ",
      jobTitle: "Attorney",
      company: "Virevos LLC",
      bio: "Hi there",
    });

    expect(mockSet).toHaveBeenCalledWith({
      name: "Jane Doe",
      jobTitle: "Attorney",
      company: "Virevos LLC",
      bio: "Hi there",
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { name: "Jane Doe" } });
    expect(result).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      jobTitle: "Attorney",
      company: "Virevos LLC",
      bio: "Hi there",
    });
  });

  it("stores nulls for omitted optional fields", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);

    await updateProfile({ name: "Jane Doe" });

    expect(mockSet).toHaveBeenCalledWith({
      name: "Jane Doe",
      jobTitle: null,
      company: null,
      bio: null,
    });
  });

  it("throws when the auth metadata update fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockUpdateUser.mockResolvedValueOnce({
      data: {},
      error: { message: "auth boom" },
    });
    await expect(updateProfile({ name: "Jane Doe" })).rejects.toThrow(
      "Failed to update profile: auth boom"
    );
  });
});

// ─── getWeeklySummaryPreference ───────────────────────────────────────────

describe("getWeeklySummaryPreference", () => {
  it("returns false when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getWeeklySummaryPreference()).resolves.toBe(false);
  });

  it("returns the stored boolean", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([{ weeklySummary: true }]);
    await expect(getWeeklySummaryPreference()).resolves.toBe(true);
  });

  it("returns false when the user row is missing", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    mockSelectWhere.mockResolvedValueOnce([]);
    await expect(getWeeklySummaryPreference()).resolves.toBe(false);
  });
});

// ─── updateWeeklySummaryPreference ────────────────────────────────────────

describe("updateWeeklySummaryPreference", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateWeeklySummaryPreference(true)).rejects.toThrow(
      "No user"
    );
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("rejects non-boolean input", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      updateWeeklySummaryPreference("yes" as unknown as boolean)
    ).rejects.toThrow("enabled must be a boolean");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("persists true", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateWeeklySummaryPreference(true)).resolves.toEqual({
      enabled: true,
    });
    expect(mockSet).toHaveBeenCalledWith({ weeklySummary: true });
  });

  it("persists false", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateWeeklySummaryPreference(false)).resolves.toEqual({
      enabled: false,
    });
    expect(mockSet).toHaveBeenCalledWith({ weeklySummary: false });
  });
});
