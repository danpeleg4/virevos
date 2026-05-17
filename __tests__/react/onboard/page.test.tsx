import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders Welcome step initially", () => {
    render(<Onboarding />);
    expect(screen.getByText(/welcome to virevos/i)).toBeInTheDocument();
  });

  it("renders step indicators", () => {
    render(<Onboarding />);
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it("renders 'Get Started' button on welcome step", () => {
    render(<Onboarding />);
    expect(
      screen.getByRole("button", { name: /get started/i })
    ).toBeInTheDocument();
  });

  it("navigates to account step when 'Get Started' is clicked", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
  });

  it("account step renders email and password fields", () => {
    render(<Onboarding />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getByPlaceholderText(/company\.com/i)).toBeInTheDocument();
  });
});
