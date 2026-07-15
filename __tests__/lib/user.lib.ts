import {
  changeRecordingStatus,
  changePassword,
  ensureUserRow,
  uploadAvatar,
  getAvatarUrl,
  getUserProfile,
  getProductUpdatesPreference,
  updateProductUpdatesPreference,
  updateProfile,
} from "@/lib/user";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { canonicalUserRow, makeFakeUserDb } from "../fakes/fake_user_db";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

const userDb = makeFakeUserDb();
const storage = makeFakeStorageClient();

const mockUser = { id: "user_1" };

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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

// ─── product updates preference ───────────────────────────────────────────

describe("getProductUpdatesPreference", () => {
  it("returns false when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getProductUpdatesPreference(userDb)).resolves.toBe(false);
    expect(userDb.getProductUpdates).not.toHaveBeenCalled();
  });

  it("returns the stored preference", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getProductUpdates.mockResolvedValueOnce([{ productUpdates: true }]);
    await expect(getProductUpdatesPreference(userDb)).resolves.toBe(true);
    expect(userDb.getProductUpdates).toHaveBeenCalledWith("user_1");
  });
});

describe("updateProductUpdatesPreference", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(updateProductUpdatesPreference(true, userDb)).rejects.toThrow(
      "No user"
    );
    expect(userDb.setProductUpdates).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean value", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(
      updateProductUpdatesPreference("yes" as unknown as boolean, userDb)
    ).rejects.toThrow("enabled must be a boolean");
    expect(userDb.setProductUpdates).not.toHaveBeenCalled();
  });

  it("persists the preference and echoes it back", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateProductUpdatesPreference(true, userDb)).resolves.toEqual(
      { enabled: true }
    );
    expect(userDb.setProductUpdates).toHaveBeenCalledWith("user_1", true);
  });
});

// ─── changeRecordingStatus ────────────────────────────────────────────────

describe("changeRecordingStatus", () => {
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(changeRecordingStatus(userDb)).rejects.toThrow("No user");
  });

  it("sets recordingStatus to false when it was true", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getUserRow.mockResolvedValueOnce([
      { ...canonicalUserRow, recordingStatus: true },
    ]);
    await changeRecordingStatus(userDb);
    expect(userDb.setRecordingStatus).toHaveBeenCalledWith("user_1", false);
  });

  it("sets recordingStatus to true when it was false", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getUserRow.mockResolvedValueOnce([
      { ...canonicalUserRow, recordingStatus: false },
    ]);
    await changeRecordingStatus(userDb);
    expect(userDb.setRecordingStatus).toHaveBeenCalledWith("user_1", true);
  });

  it("silently swallows errors (does not re-throw)", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getUserRow.mockRejectedValueOnce(new Error("DB error"));
    await changeRecordingStatus(userDb); // should not throw
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
    await ensureUserRow(userDb);
    expect(userDb.insertUserIfMissing).not.toHaveBeenCalled();
  });

  it("inserts a row with user data from the session", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "test@example.com",
      user_metadata: { name: "Test User" },
    });

    await ensureUserRow(userDb);

    expect(userDb.insertUserIfMissing).toHaveBeenCalledWith(
      "user_1",
      "test@example.com",
      "Test User"
    );
  });

  it("falls back to empty strings when email/name are missing", async () => {
    (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });

    await ensureUserRow(userDb);

    expect(userDb.insertUserIfMissing).toHaveBeenCalledWith("user_1", "", "");
  });

  it("propagates DB errors", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "x@y.com",
    });
    userDb.insertUserIfMissing.mockRejectedValueOnce(new Error("DB down"));

    await expect(ensureUserRow(userDb)).rejects.toThrow("DB down");
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
  it("throws when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(
      uploadAvatar(makeFormData(makeImage()), userDb, storage)
    ).rejects.toThrow("No user");
  });

  it("rejects when no file is provided", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(uploadAvatar(makeFormData(), userDb, storage)).rejects.toThrow(
      "An image file is required"
    );
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await expect(
      uploadAvatar(makeFormData(pdf), userDb, storage)
    ).rejects.toThrow("Unsupported image type");
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects files larger than 2MB", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const big = makeImage("image/png", 2 * 1024 * 1024 + 1);
    await expect(
      uploadAvatar(makeFormData(big), userDb, storage)
    ).rejects.toThrow("Image must be 2MB or smaller");
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("uploads to the users bucket, persists the path, and returns a signed URL", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    const result = await uploadAvatar(
      makeFormData(makeImage()),
      userDb,
      storage
    );

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    const [bucket, path, body, contentType] = storage.uploadFile.mock.calls[0];
    expect(bucket).toBe("users");
    expect(path).toMatch(/^user_1\/avatar-\d+\.png$/);
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(contentType).toBe("image/png");

    expect(userDb.setAvatarPath).toHaveBeenCalledWith("user_1", path);
    expect(storage.getSignedUrl).toHaveBeenCalledWith("users", path, 60 * 60);
    expect(result).toEqual({ url: "https://cdn/signed-url" });
  });

  it("deletes the previous avatar after a successful upload", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getAvatarPath.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-old.png" },
    ]);

    await uploadAvatar(makeFormData(makeImage()), userDb, storage);

    expect(storage.deleteFile).toHaveBeenCalledWith(
      "users",
      "user_1/avatar-old.png"
    );
  });

  it("still succeeds if deleting the previous avatar fails", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getAvatarPath.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-old.png" },
    ]);
    storage.deleteFile.mockRejectedValueOnce(new Error("delete boom"));

    const result = await uploadAvatar(
      makeFormData(makeImage()),
      userDb,
      storage
    );
    expect(result).toEqual({ url: "https://cdn/signed-url" });
  });
});

// ─── getAvatarUrl ─────────────────────────────────────────────────────────

describe("getAvatarUrl", () => {
  it("returns null when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);
    await expect(getAvatarUrl(userDb, storage)).resolves.toEqual({
      url: null,
    });
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null when the user has no avatar", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getAvatarPath.mockResolvedValueOnce([{ avatarPath: null }]);
    await expect(getAvatarUrl(userDb, storage)).resolves.toEqual({
      url: null,
    });
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL for the stored avatar path", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    userDb.getAvatarPath.mockResolvedValueOnce([
      { avatarPath: "user_1/avatar-123.png" },
    ]);
    await expect(getAvatarUrl(userDb, storage)).resolves.toEqual({
      url: "https://cdn/signed-url",
    });
    expect(storage.getSignedUrl).toHaveBeenCalledWith(
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
    await expect(getUserProfile(userDb)).resolves.toEqual(EMPTY);
  });

  it("returns all stored profile fields", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(getUserProfile(userDb)).resolves.toEqual({
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
    userDb.getProfileRow.mockResolvedValueOnce([
      {
        name: null,
        email: null,
        jobTitle: null,
        company: null,
        bio: null,
      },
    ]);
    await expect(getUserProfile(userDb)).resolves.toEqual({
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
    await expect(updateProfile({ name: "Jane" }, userDb)).rejects.toThrow(
      "No user"
    );
  });

  it("rejects an empty name", async () => {
    (getCurrentUser as Mock).mockResolvedValue(mockUser);
    await expect(updateProfile({ name: "   " }, userDb)).rejects.toThrow(
      "name is required"
    );
    expect(userDb.updateProfileRow).not.toHaveBeenCalled();
  });

  it("trims, persists all fields, and mirrors the name to auth metadata", async () => {
    (getCurrentUser as Mock).mockResolvedValue({
      id: "user_1",
      email: "jane@example.com",
    });

    const result = await updateProfile(
      {
        name: "  Jane Doe  ",
        jobTitle: "Attorney",
        company: "Virevos LLC",
        bio: "Hi there",
      },
      userDb
    );

    expect(userDb.updateProfileRow).toHaveBeenCalledWith("user_1", {
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

    await updateProfile({ name: "Jane Doe" }, userDb);

    expect(userDb.updateProfileRow).toHaveBeenCalledWith("user_1", {
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
    await expect(updateProfile({ name: "Jane Doe" }, userDb)).rejects.toThrow(
      "Failed to update profile: auth boom"
    );
  });
});
