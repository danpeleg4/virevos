import "@testing-library/jest-dom";

jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
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
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

window.HTMLElement.prototype.scrollIntoView = jest.fn();
