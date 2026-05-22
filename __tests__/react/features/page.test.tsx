import React from "react";
import { render, screen } from "@testing-library/react";

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
  it("renders features content", () => {
    render(<FeaturesPage />);
    expect(screen.getAllByText(/AI Assistant/i).length).toBeGreaterThan(0);
  });

  it("renders navigation", () => {
    render(<FeaturesPage />);
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders footer", () => {
    render(<FeaturesPage />);
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });
});
