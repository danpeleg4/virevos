import type { OpenAIClientInterface } from "@/api_client/openai_client";

export const EMBEDDING_DIMENSION = 3072;
export const EMBEDDING_MODEL = "text-embedding-3-large";
export const TRANSCRIPT_BUCKET = "recording";
export const TRANSCRIPT_INDEX = "transcription";
export const EMAILS_BUCKET = "emails";
export const EMAILS_INDEX = "emails";

export async function createEmbedding(
  text: string,
  openaiClient: OpenAIClientInterface
): Promise<number[]> {
  return openaiClient.createEmbedding(text);
}

export async function createEmbeddings(
  texts: string[],
  openaiClient: OpenAIClientInterface
): Promise<number[][]> {
  return openaiClient.createEmbeddings(texts);
}
