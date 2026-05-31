// Shared profile constants and types. Kept out of `lib/user.ts` because that
// file is a "use server" module, which may only export async functions.

/** Timezones offered in the profile settings UI. */
export const PROFILE_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Jerusalem",
] as const;

export const DEFAULT_TIMEZONE = "America/New_York";

export interface UserProfile {
  name: string;
  email: string;
  jobTitle: string;
  company: string;
  bio: string;
}

export interface UpdateProfileInput {
  name: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  timezone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
