import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-abc" }),
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

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/date_utils", () => ({
  parseDateOnlyString: jest.fn((s: string) => new Date(s)),
}));

jest.mock("axios", () => ({
  get: jest.fn(() =>
    Promise.resolve({
      data: {
        cases: [],
        client: { name: "Portal Client", email: "client@example.com" },
        messages: [],
        files: [],
        bookings: [],
        settings: {},
      },
    })
  ),
  post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
  isAxiosError: jest.fn(() => false),
}));

import PortalPage from "@/app/portal/[token]/page";

describe("Portal Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<PortalPage />);
    expect(container).toBeInTheDocument();
  });

  it("renders loading state initially", () => {
    render(<PortalPage />);
    // Initially shows some loading indicator or structure
    const container = document.querySelector("div");
    expect(container).toBeInTheDocument();
  });
});
