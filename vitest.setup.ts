import "@testing-library/jest-dom/vitest";
import type * as ReactTypes from "react";

vi.mock("motion/react", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
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
          return React.createElement(
            _tag,
            props,
            children as ReactTypes.ReactNode,
          );
        },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactTypes.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Missing `Description`") || msg.includes("aria-describedby"))
    return;
  console.warn(...args);
});

process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";

// jsdom doesn't implement matchMedia or ResizeObserver
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
