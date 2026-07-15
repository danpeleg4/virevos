import type { OpenAIClientInterface } from "@/api_client/openai_client";

export type FakeOpenAIClient = {
  [K in keyof OpenAIClientInterface]: Mock<OpenAIClientInterface[K]>;
};

export function makeFakeOpenAIClient(
  overrides: Partial<OpenAIClientInterface> = {}
): FakeOpenAIClient {
  const fake = {
    createResponse: vi.fn(async () => ({}) as never),
    streamResponse: vi.fn(() => ({}) as never),
    createJsonCompletion: vi.fn(async () => "{}"),
    createEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
    createEmbeddings: vi.fn(async (texts: string[]) =>
      texts.map(() => [0.1, 0.2, 0.3])
    ),
  } satisfies OpenAIClientInterface;

  return Object.assign(fake, overrides) as FakeOpenAIClient;
}
