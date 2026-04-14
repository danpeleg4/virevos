import React, { Suspense } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  notFound: jest.fn(),
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

import BlogPostPage from "@/app/blog/[slug]/page";

const renderPost = async (slug: string) => {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <BlogPostPage params={Promise.resolve({ slug })} />
      </Suspense>
    );
  });
};

describe("Blog Post Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the post title", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText(/Introducing Virevos 2\.0/i)).toBeInTheDocument();
  });

  it("renders the post author", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders the author role", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText(/CEO & Co-founder/i)).toBeInTheDocument();
  });

  it("renders the post category badge", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getAllByText("Company").length).toBeGreaterThan(0);
  });

  it("renders the post description", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText(/completely reimagined/i)).toBeInTheDocument();
  });

  it("renders post content headings", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText(/what's new in 2\.0/i)).toBeInTheDocument();
  });

  it("renders Back to Blog button and navigates on click", async () => {
    await renderPost("introducing-virevos-2");
    const backButton = screen.getByText(/back to blog/i);
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(mockPush).toHaveBeenCalledWith("/blog");
  });

  it("renders a different post by slug", async () => {
    await renderPost("freelance-rates-2026");
    expect(
      screen.getByText(/how to set your freelance rates in 2026/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah Kim")).toBeInTheDocument();
  });

  it("renders navigation", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getAllByText(/virevos/i).length).toBeGreaterThan(0);
  });

  it("renders footer", async () => {
    await renderPost("introducing-virevos-2");
    expect(screen.getByText(/© 2026 Virevos/i)).toBeInTheDocument();
  });

  it("renders related posts section for posts with same category", async () => {
    await renderPost("freelance-rates-2026");
    expect(screen.getByText(/more from guides/i)).toBeInTheDocument();
  });
});
