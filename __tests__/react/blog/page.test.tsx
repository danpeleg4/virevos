import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isSignedIn: false, user: null, isLoaded: true }),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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
            _tag,
            props,
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

jest.mock("@/app/components/figma/ImageWithFallback", () => ({
  ImageWithFallback: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

import Blog from "@/app/blog/page";

describe("Blog Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders Blog heading", () => {
    render(<Blog />);
    expect(screen.getByRole("heading", { name: "Blog" })).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<Blog />);
    expect(screen.getByText(/insights on freelancing/i)).toBeInTheDocument();
  });

  it("renders category filter tabs", () => {
    render(<Blog />);
    expect(
      screen.getByRole("button", { name: "Everything" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "News" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guides" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Company" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Engineering" })
    ).toBeInTheDocument();
  });

  it("renders featured post title", () => {
    render(<Blog />);
    expect(screen.getByText(/Introducing Virevos 2\.0/i)).toBeInTheDocument();
  });

  it("renders grid posts", () => {
    render(<Blog />);
    expect(
      screen.getByText(/how to set your freelance rates/i)
    ).toBeInTheDocument();
  });

  it("filters posts by category", () => {
    render(<Blog />);
    fireEvent.click(screen.getByRole("button", { name: "Guides" }));
    expect(
      screen.getByText(/how to set your freelance rates/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Introducing Virevos 2\.0/i)
    ).not.toBeInTheDocument();
  });

  it("navigates to post on click", () => {
    render(<Blog />);
    fireEvent.click(screen.getByText(/how to set your freelance rates/i));
    expect(mockPush).toHaveBeenCalledWith("/blog/freelance-rates-2026");
  });

  it("renders navigation", () => {
    render(<Blog />);
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders footer", () => {
    render(<Blog />);
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });
});
