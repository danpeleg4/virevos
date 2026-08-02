import type { UserDB, UserRow } from "@db/classes/user_db";

export const canonicalUserRow: UserRow = {
  id: 1,
  userId: "user_1",
  name: "Dan",
  email: "dan@example.com",
  avatarPath: null,
  jobTitle: null,
  company: null,
  bio: null,
  aiCredits: 0,
  storage: 0,
  recordingStatus: false,
  productUpdates: false,
  creditsResetAt: null,
  createdAt: new Date(),
};

export type FakeUserDb = {
  [K in keyof UserDB]: Mock<UserDB[K]>;
};

export function makeFakeUserDb(overrides: Partial<UserDB> = {}): FakeUserDb {
  const fake = {
    getUserRow: vi.fn(async (_userId: string) => [{ ...canonicalUserRow }]),
    getProductUpdates: vi.fn(async (_userId: string) => [
      { productUpdates: false },
    ]),
    setProductUpdates: vi.fn(async () => {}),
    setRecordingStatus: vi.fn(async () => {}),
    getAvatarPath: vi.fn(async (_userId: string) => [
      { avatarPath: null as string | null },
    ]),
    setAvatarPath: vi.fn(async () => {}),
    getProfileRow: vi.fn(async (_userId: string) => [
      {
        name: "Jane Doe",
        email: "jane@example.com",
        jobTitle: "Attorney",
        company: "Virevos LLC",
        bio: "Hello",
      },
    ]),
    updateProfileRow: vi.fn(async () => {}),
    insertUserIfMissing: vi.fn(async () => {}),
  } satisfies UserDB;

  return Object.assign(fake, overrides) as FakeUserDb;
}
