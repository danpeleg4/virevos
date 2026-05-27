"use server";

import { getCurrentUser } from "./supabase/auth";
import { db } from "@db/db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { uploadFile, getSignedUrl, deleteFile } from "./storage";
import { ValidationError } from "./util/validation";

const AVATAR_BUCKET = "users";
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
const AVATAR_EXTENSIONS: Record<(typeof ALLOWED_AVATAR_TYPES)[number], string> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_URL_TTL = 60 * 60; // signed URL valid for 1 hour

export async function changeRecordingStatus() {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  try {
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.user_id, user.id));
    const recordingStatus = userData.recordingStatus;
    await db
      .update(users)
      .set({
        recordingStatus: !recordingStatus,
      })
      .where(eq(users.user_id, user.id));
  } catch (err) {
    console.error(err);
  }
}

/**
 * Uploads a new avatar image for the current user to the "users" storage
 * bucket, persists its path, and returns a freshly signed URL for display.
 */
export async function uploadAvatar(
  formData: FormData
): Promise<{ url: string }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("An image file is required");
  }

  const type = file.type as (typeof ALLOWED_AVATAR_TYPES)[number];
  if (!ALLOWED_AVATAR_TYPES.includes(type)) {
    throw new ValidationError(
      "Unsupported image type. Use JPG, PNG, GIF or WebP."
    );
  }
  if (file.size === 0) {
    throw new ValidationError("The selected file is empty");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new ValidationError("Image must be 2MB or smaller");
  }

  // Look up any existing avatar so we can clean it up after a successful upload.
  const [existing] = await db
    .select({ avatarPath: users.avatarPath })
    .from(users)
    .where(eq(users.user_id, user.id));

  const buffer = Buffer.from(await file.arrayBuffer());
  // A unique filename per upload sidesteps any CDN caching of a reused path.
  const path = `${user.id}/avatar-${Date.now()}.${AVATAR_EXTENSIONS[type]}`;

  await uploadFile(AVATAR_BUCKET, path, buffer, file.type);
  await db
    .update(users)
    .set({ avatarPath: path })
    .where(eq(users.user_id, user.id));

  if (existing?.avatarPath && existing.avatarPath !== path) {
    try {
      await deleteFile(AVATAR_BUCKET, existing.avatarPath);
    } catch (err) {
      // A leftover old avatar is harmless; don't fail the upload over it.
      console.error("Failed to remove previous avatar", err);
    }
  }

  const url = await getSignedUrl(AVATAR_BUCKET, path, AVATAR_URL_TTL);
  return { url };
}

/** Returns a signed URL for the current user's avatar, or null if none set. */
export async function getAvatarUrl(): Promise<{ url: string | null }> {
  const user = await getCurrentUser();
  if (!user?.id) return { url: null };

  const [row] = await db
    .select({ avatarPath: users.avatarPath })
    .from(users)
    .where(eq(users.user_id, user.id));

  if (!row?.avatarPath) return { url: null };

  const url = await getSignedUrl(AVATAR_BUCKET, row.avatarPath, AVATAR_URL_TTL);
  return { url };
}

export async function ensureUserRow() {
  const user = await getCurrentUser();
  if (!user?.id) return;

  const email = user.email ?? "";
  const name = (user.user_metadata?.name as string | undefined) ?? "";

  await db
    .insert(users)
    .values({ user_id: user.id, email, name })
    .onConflictDoNothing({ target: users.user_id });
}
