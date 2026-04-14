import { supabaseAdmin } from "./supabase";

export async function uploadFile(
  bucket: string,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function downloadFile(
  bucket: string,
  path: string
): Promise<Uint8Array> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);
  if (error || !data)
    throw new Error(`Storage download failed: ${error?.message}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data)
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function listFiles(
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix);
  if (error) throw new Error(`Storage list failed: ${error.message}`);
  return (data ?? []).map((f) => `${prefix}/${f.name}`);
}
