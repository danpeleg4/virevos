import React from "react";
import { render } from "vitest-browser-react";

vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn(function () {
    return { defaultOptions: {} };
  }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("renders children without crashing", async () => {
    const screen = await render(
      <Providers>
        <div data-testid="child">Hello World</div>
      </Providers>
    );
    await expect.element(screen.getByTestId("child")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Hello World", { exact: true }))
      .toBeInTheDocument();
  });
});
