"use server";

import { getCurrentUser } from "./supabase/auth";
import { createServerSupabase } from "./supabase/server";
import { db } from "@db/db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { uploadFile, getSignedUrl, deleteFile } from "./storage";
import {
  ValidationError,
  requireString,
  optionalString,
  requireOneOf,
  MAX_NAME,
  MAX_SHORT,
} from "./util/validation";
import {
  PROFILE_TIMEZONES,
  DEFAULT_TIMEZONE,
  type UserProfile,
  type UpdateProfileInput,
} from "./user_profile";

const MAX_BIO = 280;

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

export async function getProductUpdatesPreference() {
  const user = await getCurrentUser();
  if (!user?.id) return false;

  const [row] = await db
    .select({
      productUpdates: users.productUpdates,
    })
    .from(users)
    .where(eq(users.user_id, user.id));

  return row.productUpdates;
}

export async function updateProductUpdatesPreference(enabled: boolean) {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  if (typeof enabled !== "boolean") {
    throw new ValidationError("enabled must be a boolean");
  }

  await db
    .update(users)
    .set({ productUpdates: enabled })
    .where(eq(users.user_id, user.id));

  return { enabled };
}

export async function getWeeklySummaryPreference(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;

  const [row] = await db
    .select({ weeklySummary: users.weeklySummary })
    .from(users)
    .where(eq(users.user_id, user.id));

  return !!row?.weeklySummary;
}

export async function updateWeeklySummaryPreference(
  enabled: boolean
): Promise<{ enabled: boolean }> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");
  if (typeof enabled !== "boolean") {
    throw new ValidationError("enabled must be a boolean");
  }

  await db
    .update(users)
    .set({ weeklySummary: enabled })
    .where(eq(users.user_id, user.id));

  return { enabled };
}

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

/** Returns the current user's editable profile fields. */
export async function getUserProfile(): Promise<UserProfile> {
  const user = await getCurrentUser();
  const empty: UserProfile = {
    name: "",
    email: "",
    jobTitle: "",
    company: "",
    bio: "",
    timezone: DEFAULT_TIMEZONE,
  };
  if (!user?.id) return empty;

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      jobTitle: users.jobTitle,
      company: users.company,
      bio: users.bio,
      timezone: users.timezone,
    })
    .from(users)
    .where(eq(users.user_id, user.id));

  return {
    name: row?.name ?? (user.user_metadata?.name as string | undefined) ?? "",
    email: row?.email ?? user.email ?? "",
    jobTitle: row?.jobTitle ?? "",
    company: row?.company ?? "",
    bio: row?.bio ?? "",
    timezone: row?.timezone ?? DEFAULT_TIMEZONE,
  };
}

/**
 * Updates the current user's profile. Writes all fields to the `users` table
 * and mirrors the display name into Supabase auth metadata so it shows
 * everywhere the authenticated user is read (e.g. the app header).
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("No user");

  const name = requireString(input.name, "name", MAX_NAME);
  const jobTitle =
    optionalString(input.jobTitle, "jobTitle", MAX_SHORT) ?? null;
  const company = optionalString(input.company, "company", MAX_SHORT) ?? null;
  const bio = optionalString(input.bio, "bio", MAX_BIO) ?? null;
  const timezone = input.timezone
    ? requireOneOf(input.timezone, "timezone", PROFILE_TIMEZONES)
    : null;

  await db
    .update(users)
    .set({ name, jobTitle, company, bio, timezone })
    .where(eq(users.user_id, user.id));

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  return {
    name,
    email: user.email ?? "",
    jobTitle: jobTitle ?? "",
    company: company ?? "",
    bio: bio ?? "",
    timezone: timezone ?? DEFAULT_TIMEZONE,
  };
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
