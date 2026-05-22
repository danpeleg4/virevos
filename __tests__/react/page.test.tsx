import React from "react";
import { render, screen } from "@testing-library/react";

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
  beforeEach(() => {
    render(<Page />);
  });

  it("renders Hero section", () => {
    expect(screen.getByText(/practice flows better/i)).toBeInTheDocument();
  });

  it("renders Features section", () => {
    expect(screen.getByText(/case lifecycle automation/i)).toBeInTheDocument();
  });

  it("renders CTA section", () => {
    expect(screen.getByText(/ready to transform/i)).toBeInTheDocument();
  });

  it("renders Footer section", () => {
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });

  it("renders navigation", () => {
    const vireTypes = screen.getAllByText(/virevos/i);
    expect(vireTypes.length).toBeGreaterThan(0);
  });
});
