import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import type { ReactElement } from "react";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export async function renderWithQueryClient(
  ui: ReactElement,
  client: QueryClient = makeQueryClient()
) {
  const screen = await render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
  return Object.assign(screen, { client });
}
