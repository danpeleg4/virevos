import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
const mockUseUser = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: jest.fn(() => "/"),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  UserButton: () => <div data-testid="user-button" />,
}));

jest.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: jest.fn() }),
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
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
          return createElement(
            _tag as keyof JSX.IntrinsicElements,
            props as JSX.IntrinsicElements[keyof JSX.IntrinsicElements],
            children as React.ReactNode
          );
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
      mockUseUser.mockReturnValue({
        isSignedIn: false,
        user: null,
        isLoaded: true,
      });
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
      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: { fullName: "Test User" },
        isLoaded: true,
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
      mockUseUser.mockReturnValue({
        isSignedIn: false,
        user: null,
        isLoaded: true,
      });
      render(<Navigation />);
    });

    it("opens mobile menu when hamburger button is clicked", () => {
      // The mobile menu button renders only an icon with no accessible name
      // Find it as the last button in the nav before menu items appear
      const buttons = screen.getAllByRole("button");
      // The hamburger/menu toggle is the last button
      const menuButton = buttons[buttons.length - 1];
      expect(menuButton).toBeInTheDocument();
      fireEvent.click(menuButton);
      // After opening, mobile nav items should be visible
      expect(screen.getAllByText(/pricing/i).length).toBeGreaterThan(0);
    });
  });
});
