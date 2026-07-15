import axios from "axios";

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export function rethrowGraphError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const graphMsg = (err.response?.data as { error?: { message?: string } })
      ?.error?.message;
    throw new Error(graphMsg ?? err.message);
  }
  throw err;
}
