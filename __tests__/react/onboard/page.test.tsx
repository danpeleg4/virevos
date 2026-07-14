import React from "react";
import { render } from "vitest-browser-react";

const mockPush = vi.fn();
const mockSignUp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
    },
  }),
}));

vi.mock("@/lib/workspace/billing", () => ({
  registerFreePlan: vi.fn(),
}));

vi.mock("@/app/onboard/PaymentStep", () => ({
  __esModule: true,
  default: () => <div data-testid="payment-step" />,
}));

import Onboarding from "@/app/onboard/page";

describe("Onboarding Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSignUp.mockReset();
    mockVerifyOtp.mockReset();
    mockResend.mockReset();
  });

  it("renders Welcome step initially", async () => {
    const screen = await render(<Onboarding />);
    await expect
      .element(screen.getByText(/welcome to virevos/i))
      .toBeInTheDocument();
  });

  it("renders step indicators", async () => {
    const screen = await render(<Onboarding />);
    await expect
      .element(screen.getByText(/welcome/i).first())
      .toBeInTheDocument();
  });

  it("renders 'Get Started' button on welcome step", async () => {
    const screen = await render(<Onboarding />);
    await expect
      .element(screen.getByRole("button", { name: /get started/i }))
      .toBeInTheDocument();
  });

  it("navigates to account step when 'Get Started' is clicked", async () => {
    const screen = await render(<Onboarding />);
    await screen.getByRole("button", { name: /get started/i }).click();
    await expect
      .element(screen.getByText(/create your account/i))
      .toBeInTheDocument();
  });

  it("account step renders email and password fields", async () => {
    const screen = await render(<Onboarding />);
    await screen.getByRole("button", { name: /get started/i }).click();
    await expect
      .element(screen.getByPlaceholder(/company\.com/i))
      .toBeInTheDocument();
  });
});
