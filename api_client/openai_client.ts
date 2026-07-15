import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-large";

let _instance: OpenAI | undefined;

function getInstance(): OpenAI {
  if (!_instance) {
    _instance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _instance;
}

// Lazy proxy so the SDK (and its env key) is only touched on first real call.
const openaiSdk = new Proxy({} as OpenAI, {
  get(_: OpenAI, prop: string | symbol) {
    return getInstance()[prop as keyof OpenAI];
  },
});

type StreamResponseParams = Omit<
  OpenAI.Responses.ResponseCreateParamsNonStreaming,
  "stream"
>;

export interface OpenAIClientInterface {
  createResponse(
    params: OpenAI.Responses.ResponseCreateParamsNonStreaming
  ): Promise<OpenAI.Responses.Response>;
  streamResponse(
    params: StreamResponseParams
  ): ReturnType<OpenAI["responses"]["stream"]>;
  /** Single-prompt chat completion that returns the raw JSON content string. */
  createJsonCompletion(model: string, prompt: string): Promise<string>;
  createEmbedding(text: string): Promise<number[]>;
  createEmbeddings(texts: string[]): Promise<number[][]>;
}

export class OpenAIClient implements OpenAIClientInterface {
  constructor(private readonly sdk: OpenAI) {}

  async createResponse(
    params: OpenAI.Responses.ResponseCreateParamsNonStreaming
  ): Promise<OpenAI.Responses.Response> {
    return this.sdk.responses.create(params);
  }

  streamResponse(
    params: StreamResponseParams
  ): ReturnType<OpenAI["responses"]["stream"]> {
    return this.sdk.responses.stream(params);
  }

  async createJsonCompletion(model: string, prompt: string): Promise<string> {
    const response = await this.sdk.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    return response.choices[0].message.content ?? "{}";
  }

  async createEmbedding(text: string): Promise<number[]> {
    const res = await this.sdk.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return res.data[0].embedding;
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.sdk.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    return res.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

export const openAIClient = new OpenAIClient(openaiSdk);
