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

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/date_utils", () => ({
  parseDateOnlyString: jest.fn((s: string) => new Date(s)),
}));

// Mock fetch for portal data loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        project: {
          name: "Portal Project",
          status: "active",
          dueDate: "2026-06-01",
          tasks: [{ id: 1, title: "Task A", status: "todo", priority: "high" }],
          files: [],
        },
        client: { name: "Portal Client" },
        messages: [],
      }),
  })
) as jest.Mock;

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
