import { db, type DrizzleDB } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export type UserRow = typeof users.$inferSelect;

export type UserProfileRow = {
  name: string | null;
  email: string | null;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
};

export interface UserDB {
  getUserRow(userId: string): Promise<UserRow[]>;
  getProductUpdates(userId: string): Promise<{ productUpdates: boolean }[]>;
  setProductUpdates(userId: string, enabled: boolean): Promise<void>;
  setRecordingStatus(userId: string, status: boolean): Promise<void>;
  getAvatarPath(userId: string): Promise<{ avatarPath: string | null }[]>;
  setAvatarPath(userId: string, path: string): Promise<void>;
  getProfileRow(userId: string): Promise<UserProfileRow[]>;
  updateProfileRow(
    userId: string,
    fields: {
      name: string;
      jobTitle: string | null;
      company: string | null;
      bio: string | null;
    }
  ): Promise<void>;
  insertUserIfMissing(
    userId: string,
    email: string,
    name: string
  ): Promise<void>;
}

export class UsersDrizzle implements UserDB {
  constructor(private readonly db: DrizzleDB) {}

  async getUserRow(userId: string): Promise<UserRow[]> {
    return this.db.select().from(users).where(eq(users.userId, userId));
  }

  async getProductUpdates(
    userId: string
  ): Promise<{ productUpdates: boolean }[]> {
    return this.db
      .select({ productUpdates: users.productUpdates })
      .from(users)
      .where(eq(users.userId, userId));
  }

  async setProductUpdates(userId: string, enabled: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ productUpdates: enabled })
      .where(eq(users.userId, userId));
  }

  async setRecordingStatus(userId: string, status: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ recordingStatus: status })
      .where(eq(users.userId, userId));
  }

  async getAvatarPath(
    userId: string
  ): Promise<{ avatarPath: string | null }[]> {
    return this.db
      .select({ avatarPath: users.avatarPath })
      .from(users)
      .where(eq(users.userId, userId));
  }

  async setAvatarPath(userId: string, path: string): Promise<void> {
    await this.db
      .update(users)
      .set({ avatarPath: path })
      .where(eq(users.userId, userId));
  }

  async getProfileRow(userId: string): Promise<UserProfileRow[]> {
    return this.db
      .select({
        name: users.name,
        email: users.email,
        jobTitle: users.jobTitle,
        company: users.company,
        bio: users.bio,
      })
      .from(users)
      .where(eq(users.userId, userId));
  }

  async updateProfileRow(
    userId: string,
    fields: {
      name: string;
      jobTitle: string | null;
      company: string | null;
      bio: string | null;
    }
  ): Promise<void> {
    await this.db.update(users).set(fields).where(eq(users.userId, userId));
  }

  async insertUserIfMissing(
    userId: string,
    email: string,
    name: string
  ): Promise<void> {
    await this.db
      .insert(users)
      .values({ userId, email, name })
      .onConflictDoNothing({ target: users.userId });
  }
}

export const userDrizzle = new UsersDrizzle(db);
