import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: vi.fn(() => "/workspace/dashboard"),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "John",
      lastName: "Doe",
      primaryEmailAddress: { emailAddress: "john@example.com" },
    },
    isLoaded: true,
  }),
  UserButton: () => <div data-testid="user-button" />,
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
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

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock("axios", () => {
  const axios = {
    get: vi.fn(() => Promise.resolve({ data: { bookings: [] } })),
  };
  return { default: axios, ...axios };
});

vi.mock("@/app/components/AIAssistant", () => ({
  AIAssistant: () => null,
}));

import WorkSpaceLayout from "@/app/workspace/layout";

describe("WorkSpaceLayout", () => {
  it("renders children content", () => {
    render(
      <WorkSpaceLayout>
        <div data-testid="page-content">Dashboard Content</div>
      </WorkSpaceLayout>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders sidebar navigation", () => {
    render(
      <WorkSpaceLayout>
        <div />
      </WorkSpaceLayout>
    );
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });
});
