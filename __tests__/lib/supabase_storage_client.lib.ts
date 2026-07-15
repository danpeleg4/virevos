import type { SupabaseClient } from "@supabase/supabase-js";

// the module builds its singleton from supabaseAdmin at import time
vi.mock("@/lib/supabase/supabase", () => ({
  supabaseAdmin: {},
}));

import { SupabaseStorageClient } from "@/api_client/supabase_storage_client";

// The class only touches `.storage.from(bucket)`, so a narrow fake suffices.
const upload = vi.fn();
const download = vi.fn();
const createSignedUrl = vi.fn();
const remove = vi.fn();
const list = vi.fn();
const from = vi.fn(() => ({
  upload,
  download,
  createSignedUrl,
  remove,
  list,
}));

const fakeSupabase = { storage: { from } } as unknown as SupabaseClient;
const client = new SupabaseStorageClient(fakeSupabase);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SupabaseStorageClient", () => {
  describe("uploadFile", () => {
    it("uploads with contentType and upsert", async () => {
      upload.mockResolvedValueOnce({ error: null });
      const body = new Uint8Array([1, 2]);

      await client.uploadFile("bucket", "a/b.png", body, "image/png");

      expect(from).toHaveBeenCalledWith("bucket");
      expect(upload).toHaveBeenCalledWith("a/b.png", body, {
        contentType: "image/png",
        upsert: true,
      });
    });

    it("throws on upload error", async () => {
      upload.mockResolvedValueOnce({ error: { message: "boom" } });
      await expect(
        client.uploadFile("bucket", "a/b.png", new Uint8Array(), "image/png")
      ).rejects.toThrow("Storage upload failed: boom");
    });
  });

  describe("downloadFile", () => {
    it("returns the file bytes", async () => {
      const blob = new Blob([new Uint8Array([7, 8, 9])]);
      download.mockResolvedValueOnce({ data: blob, error: null });

      const bytes = await client.downloadFile("bucket", "a/b.png");

      expect(Array.from(bytes)).toEqual([7, 8, 9]);
    });

    it("throws when download fails", async () => {
      download.mockResolvedValueOnce({
        data: null,
        error: { message: "missing" },
      });
      await expect(client.downloadFile("bucket", "a/b.png")).rejects.toThrow(
        "Storage download failed: missing"
      );
    });
  });

  describe("getSignedUrl", () => {
    it("returns the signed url", async () => {
      createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: "https://cdn/x" },
        error: null,
      });

      await expect(client.getSignedUrl("bucket", "a/b.png", 60)).resolves.toBe(
        "https://cdn/x"
      );
      expect(createSignedUrl).toHaveBeenCalledWith("a/b.png", 60);
    });

    it("throws when signing fails", async () => {
      createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: "nope" },
      });
      await expect(
        client.getSignedUrl("bucket", "a/b.png", 60)
      ).rejects.toThrow("Failed to create signed URL: nope");
    });
  });

  describe("deleteFile", () => {
    it("removes the path", async () => {
      remove.mockResolvedValueOnce({ error: null });

      await client.deleteFile("bucket", "a/b.png");

      expect(remove).toHaveBeenCalledWith(["a/b.png"]);
    });

    it("throws on delete error", async () => {
      remove.mockResolvedValueOnce({ error: { message: "boom" } });
      await expect(client.deleteFile("bucket", "a/b.png")).rejects.toThrow(
        "Storage delete failed: boom"
      );
    });
  });

  describe("listFiles", () => {
    it("returns prefixed file names", async () => {
      list.mockResolvedValueOnce({
        data: [{ name: "one.png" }, { name: "two.png" }],
        error: null,
      });

      await expect(client.listFiles("bucket", "user_1")).resolves.toEqual([
        "user_1/one.png",
        "user_1/two.png",
      ]);
    });

    it("returns an empty list when data is null", async () => {
      list.mockResolvedValueOnce({ data: null, error: null });
      await expect(client.listFiles("bucket", "user_1")).resolves.toEqual([]);
    });

    it("throws on list error", async () => {
      list.mockResolvedValueOnce({ error: { message: "boom" } });
      await expect(client.listFiles("bucket", "user_1")).rejects.toThrow(
        "Storage list failed: boom"
      );
    });
  });
});
