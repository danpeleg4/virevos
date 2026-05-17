import React from "react";
import { render, screen } from "@testing-library/react";

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
  it("renders children without crashing", () => {
    render(
      <Providers>
        <div data-testid="child">Hello World</div>
      </Providers>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });
});
