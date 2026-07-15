import { worker } from "./__tests__/msw/worker";

beforeAll(async () => {
  await worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      // only app-API traffic must be handled; ignore Vite module/asset requests
      if (new URL(request.url).pathname.startsWith("/api")) {
        print.error();
      }
    },
  });
});

afterEach(() => {
  worker.resetHandlers();
});

afterAll(() => {
  worker.stop();
});

vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Missing `Description`") || msg.includes("aria-describedby"))
    return;
  console.warn(...args);
});

// the browser has no `process`; app code still reads process.env at runtime
if (typeof process === "undefined") {
  (
    globalThis as unknown as { process: { env: Record<string, string> } }
  ).process = { env: {} };
}
process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro";
process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_biz";
