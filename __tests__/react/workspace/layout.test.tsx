import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: jest.fn(() => "/workspace/dashboard"),
}));

jest.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { firstName: "John", lastName: "Doe", primaryEmailAddress: { emailAddress: "john@example.com" } },
    isLoaded: true,
  }),
  UserButton: () => <div data-testid="user-button" />,
}));

jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: "light", setTheme: jest.fn() })),
}));

jest.mock("motion/react", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const motion = new Proxy(
    {},
    {
      get: (_t, _tag: string) =>
        function MC({ children, initial, animate, exit, variants, transition, viewport, whileInView, whileHover, whileTap, ...props }: Record<string, unknown>) {
          return createElement(
            _tag as keyof JSX.IntrinsicElements,
            props as JSX.IntrinsicElements[keyof JSX.IntrinsicElements],
            children as React.ReactNode,
          );
        },
    }
  );
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

jest.mock("@/app/components/AIAssistant", () => ({
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
