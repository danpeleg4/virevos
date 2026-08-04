import { eq } from "drizzle-orm";
import { UsersDrizzle } from "@db/classes/user_db";
import { users } from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("UsersDrizzle (integration)", () => {
  const usersDb = new UsersDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  describe("getUserRow", () => {
    it("returns the full user row", async () => {
      const rows = await usersDb.getUserRow("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe("user_1");
    });
  });

  describe("getProductUpdates", () => {
    it("returns the productUpdates flag", async () => {
      await testDb
        .update(users)
        .set({ productUpdates: true })
        .where(eq(users.userId, "user_1"));

      const [row] = await usersDb.getProductUpdates("user_1");

      expect(row.productUpdates).toBe(true);
    });
  });

  describe("setProductUpdates", () => {
    it("updates the productUpdates flag", async () => {
      await usersDb.setProductUpdates("user_1", true);

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.productUpdates).toBe(true);
    });
  });

  describe("setRecordingStatus", () => {
    it("updates the recordingStatus flag", async () => {
      await usersDb.setRecordingStatus("user_1", false);

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.recordingStatus).toBe(false);
    });
  });

  describe("getAvatarPath", () => {
    it("returns the avatar path", async () => {
      await testDb
        .update(users)
        .set({ avatarPath: "/avatars/1.png" })
        .where(eq(users.userId, "user_1"));

      const [row] = await usersDb.getAvatarPath("user_1");

      expect(row.avatarPath).toBe("/avatars/1.png");
    });
  });

  describe("setAvatarPath", () => {
    it("updates the avatar path", async () => {
      await usersDb.setAvatarPath("user_1", "/avatars/2.png");

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.avatarPath).toBe("/avatars/2.png");
    });
  });

  describe("getProfileRow", () => {
    it("returns the profile fields", async () => {
      await testDb
        .update(users)
        .set({ name: "Jane", jobTitle: "Engineer", company: "Acme", bio: "Hi" })
        .where(eq(users.userId, "user_1"));

      const [row] = await usersDb.getProfileRow("user_1");

      expect(row).toMatchObject({
        name: "Jane",
        jobTitle: "Engineer",
        company: "Acme",
        bio: "Hi",
      });
    });
  });

  describe("updateProfileRow", () => {
    it("updates the profile fields", async () => {
      await usersDb.updateProfileRow("user_1", {
        name: "New Name",
        jobTitle: "CTO",
        company: null,
        bio: null,
      });

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.name).toBe("New Name");
      expect(row.jobTitle).toBe("CTO");
      expect(row.company).toBeNull();
    });
  });

  describe("insertUserIfMissing", () => {
    it("creates the user when it does not exist", async () => {
      await usersDb.insertUserIfMissing("user_new", "new@x.com", "New User");

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_new"));
      expect(row.email).toBe("new@x.com");
      expect(row.name).toBe("New User");
    });

    it("does not overwrite an existing user", async () => {
      await testDb
        .update(users)
        .set({ name: "Original Name" })
        .where(eq(users.userId, "user_1"));

      await usersDb.insertUserIfMissing("user_1", "ignored@x.com", "Ignored");

      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.userId, "user_1"));
      expect(row.name).toBe("Original Name");
    });
  });
});
