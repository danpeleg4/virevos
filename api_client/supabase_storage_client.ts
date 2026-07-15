import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/supabase";

export type VectorQueryParams = {
  queryVector: { float32: number[] };
  topK: number;
  filter?: Record<string, unknown>;
  returnMetadata?: boolean;
};

export type VectorHit = {
  metadata?: Record<string, unknown>;
};

export type VectorPutItem = {
  key: string;
  data: { float32: number[] };
  metadata?: Record<string, unknown>;
};

export interface StorageClientInterface {
  uploadFile(
    bucket: string,
    path: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<void>;
  downloadFile(bucket: string, path: string): Promise<Uint8Array>;
  getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number
  ): Promise<string>;
  deleteFile(bucket: string, path: string): Promise<void>;
  listFiles(bucket: string, prefix: string): Promise<string[]>;
  /** Queries a storage vector index; returns matching hits (empty on error). */
  queryVectors(
    bucket: string,
    indexName: string,
    params: VectorQueryParams
  ): Promise<VectorHit[]>;
  /** Writes/updates vectors in a storage vector index. */
  putVectors(
    bucket: string,
    indexName: string,
    vectors: VectorPutItem[]
  ): Promise<void>;
}

export class SupabaseStorageClient implements StorageClientInterface {
  constructor(private readonly supabase: SupabaseClient) {}

  async uploadFile(
    bucket: string,
    path: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, body, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  async downloadFile(bucket: string, path: string): Promise<Uint8Array> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);
    if (error || !data)
      throw new Error(`Storage download failed: ${error?.message}`);
    return new Uint8Array(await data.arrayBuffer());
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data)
      throw new Error(`Failed to create signed URL: ${error?.message}`);
    return data.signedUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
  }

  async listFiles(bucket: string, prefix: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .list(prefix);
    if (error) throw new Error(`Storage list failed: ${error.message}`);
    return (data ?? []).map((f) => `${prefix}/${f.name}`);
  }

  async queryVectors(
    bucket: string,
    indexName: string,
    params: VectorQueryParams
  ): Promise<VectorHit[]> {
    const index = this.supabase.storage.vectors.from(bucket).index(indexName);
    const { data, error } = await index.queryVectors(params);
    if (error) {
      console.error(`[queryVectors ${bucket}/${indexName}]`, error);
      return [];
    }
    return (data?.vectors ?? []) as VectorHit[];
  }

  async putVectors(
    bucket: string,
    indexName: string,
    vectors: VectorPutItem[]
  ): Promise<void> {
    const index = this.supabase.storage.vectors.from(bucket).index(indexName);
    const { error } = await index.putVectors({ vectors });
    if (error) throw new Error(`Vector put failed: ${error.message}`);
  }
}

export const supabaseStorageClient = new SupabaseStorageClient(supabaseAdmin);
