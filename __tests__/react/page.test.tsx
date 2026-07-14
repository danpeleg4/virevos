import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => ({ data: null, isPending: false }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
}));

import Page from "@/app/page";

describe("Root Page (Landing)", () => {
  let screen: RenderResult;

  beforeEach(async () => {
    screen = await render(<Page />);
  });

  it("renders Hero section", async () => {
    await expect
      .element(screen.getByText(/practice flows better/i))
      .toBeInTheDocument();
  });

  it("renders Features section", async () => {
    await expect
      .element(screen.getByText(/case lifecycle automation/i))
      .toBeInTheDocument();
  });

  it("renders CTA section", async () => {
    await expect
      .element(screen.getByText(/ready to transform/i))
      .toBeInTheDocument();
  });

  it("renders Footer section", async () => {
    await expect
      .element(screen.getByText(/© 2026 Virevos/i))
      .toBeInTheDocument();
  });

  it("renders navigation", async () => {
    await expect
      .element(screen.getByText(/virevos/i).first())
      .toBeInTheDocument();
  });
});
