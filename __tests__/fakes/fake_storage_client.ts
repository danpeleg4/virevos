import type { StorageClientInterface } from "@/api_client/supabase_storage_client";

export type FakeStorageClient = {
  [K in keyof StorageClientInterface]: Mock<StorageClientInterface[K]>;
};

export function makeFakeStorageClient(
  overrides: Partial<StorageClientInterface> = {}
): FakeStorageClient {
  const fake = {
    uploadFile: vi.fn(async () => {}),
    downloadFile: vi.fn(async () => new Uint8Array()),
    getSignedUrl: vi.fn(async () => "https://cdn/signed-url"),
    deleteFile: vi.fn(async () => {}),
    listFiles: vi.fn(async () => [] as string[]),
    queryVectors: vi.fn(async () => [] as never[]),
    putVectors: vi.fn(async () => {}),
  } satisfies StorageClientInterface;

  return Object.assign(fake, overrides) as FakeStorageClient;
}
