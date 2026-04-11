import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    defaultOptions: {},
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
