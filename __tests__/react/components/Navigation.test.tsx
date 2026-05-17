import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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

vi.mock("motion/react", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({
          children,
          initial,
          animate,
          exit,
          variants,
          transition,
          viewport,
          whileInView,
          whileHover,
          whileTap,
          ...props
        }: Record<string, unknown>) {
          return createElement(_tag, props, children as React.ReactNode);
        },
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

import { Navigation } from "@/app/components/Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("when user is not signed in", () => {
    beforeEach(() => {
      mockUseAuthUser.mockReturnValue({ data: null, isPending: false });
      render(<Navigation />);
    });

    it("renders the brand/logo", () => {
      expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
    });

    it("shows Login button", () => {
      expect(
        screen.getByRole("button", { name: /login/i })
      ).toBeInTheDocument();
    });

    it("shows Sign Up button", () => {
      expect(
        screen.getByRole("button", { name: /sign up/i })
      ).toBeInTheDocument();
    });
  });

  describe("when user is signed in", () => {
    beforeEach(() => {
      mockUseAuthUser.mockReturnValue({
        data: {
          id: "user_1",
          email: "test@example.com",
          user_metadata: { name: "Test User" },
        },
        isPending: false,
      });
      render(<Navigation />);
    });

    it("does not show Login button", () => {
      expect(
        screen.queryByRole("button", { name: /^login$/i })
      ).not.toBeInTheDocument();
    });

    it("shows Dashboard button", () => {
      expect(
        screen.getByRole("button", { name: /dashboard/i })
      ).toBeInTheDocument();
    });
  });

  describe("mobile menu", () => {
    beforeEach(() => {
      mockUseAuthUser.mockReturnValue({ data: null, isPending: false });
      render(<Navigation />);
    });

    it("opens mobile menu when hamburger button is clicked", () => {
      const buttons = screen.getAllByRole("button");
      const menuButton = buttons[buttons.length - 1];
      expect(menuButton).toBeInTheDocument();
      fireEvent.click(menuButton);
      expect(screen.getAllByText(/pricing/i).length).toBeGreaterThan(0);
    });
  });
});
