import React from "react";
import { render } from "vitest-browser-react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => ({ data: null, isPending: false }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

import FeaturesPage from "@/app/features/page";

describe("Features Page", () => {
  it("renders features content", async () => {
    const screen = await render(<FeaturesPage />);
    await expect
      .element(screen.getByText(/AI Assistant/i).first())
      .toBeInTheDocument();
  });

  it("renders navigation", async () => {
    const screen = await render(<FeaturesPage />);
    await expect
      .element(screen.getByText(/virevos/i).first())
      .toBeInTheDocument();
  });

  it("renders footer", async () => {
    const screen = await render(<FeaturesPage />);
    await expect
      .element(screen.getByText(/© 2026 Virevos/i))
      .toBeInTheDocument();
  });
});
