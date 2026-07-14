import React from "react";
import { render, type RenderResult } from "vitest-browser-react";

const mockPush = vi.fn();
const mockUseAuthUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/app/hooks/useAuthUser", () => ({
  useAuthUser: () => mockUseAuthUser(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

import { Navigation } from "@/app/components/Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("when user is not signed in", () => {
    let screen: RenderResult;

    beforeEach(async () => {
      mockUseAuthUser.mockReturnValue({ data: null, isPending: false });
      screen = await render(<Navigation />);
    });

    it("renders the brand/logo", async () => {
      await expect
        .element(screen.getByText(/virevos/i).first())
        .toBeInTheDocument();
    });

    it("shows Login button", async () => {
      await expect
        .element(screen.getByRole("button", { name: /login/i }))
        .toBeInTheDocument();
    });

    it("shows Sign Up button", async () => {
      await expect
        .element(screen.getByRole("button", { name: /sign up/i }))
        .toBeInTheDocument();
    });
  });

  describe("when user is signed in", () => {
    let screen: RenderResult;

    beforeEach(async () => {
      mockUseAuthUser.mockReturnValue({
        data: {
          id: "user_1",
          email: "test@example.com",
          user_metadata: { name: "Test User" },
        },
        isPending: false,
      });
      screen = await render(<Navigation />);
    });

    it("does not show Login button", async () => {
      await expect
        .element(screen.getByRole("button", { name: /^login$/i }))
        .not.toBeInTheDocument();
    });

    it("shows Dashboard button", async () => {
      await expect
        .element(screen.getByRole("button", { name: /dashboard/i }))
        .toBeInTheDocument();
    });
  });

  describe("mobile menu", () => {
    let screen: RenderResult;

    beforeEach(async () => {
      mockUseAuthUser.mockReturnValue({ data: null, isPending: false });
      screen = await render(<Navigation />);
    });

    it("opens mobile menu when hamburger button is clicked", async () => {
      const menuButton = screen.getByRole("button").last();
      await expect.element(menuButton).toBeInTheDocument();
      await menuButton.click();
      await expect
        .element(screen.getByText(/pricing/i).first())
        .toBeInTheDocument();
    });
  });
});
