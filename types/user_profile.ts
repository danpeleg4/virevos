// Shared profile constants and types. Kept out of `lib/user.ts` because that
// file is a "use server" module, which may only export async functions.

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
