import { isAxiosError } from "axios";

/**
 * Extracts the server-provided `{ error }` message from a failed axios call so
 * UI error states show the API's message instead of axios's generic
 * "Request failed with status code NNN".
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
