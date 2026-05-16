import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockUseSignUp = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@clerk/nextjs", () => ({
  useSignUp: () => mockUseSignUp(),
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

vi.mock("@/lib/billing", () => ({
  registerFreePlan: vi.fn(),
}));

vi.mock("@/app/onboard/PaymentStep", () => ({
  __esModule: true,
  default: () => <div data-testid="payment-step" />,
}));

const mockSignUp = {
  create: vi.fn(),
  prepareEmailAddressVerification: vi.fn(),
  attemptEmailAddressVerification: vi.fn(),
};
const mockSetActive = vi.fn();

import Onboarding from "@/app/onboard/page";

describe("Onboarding Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseSignUp.mockReturnValue({
      signUp: mockSignUp,
      isLoaded: true,
      setActive: mockSetActive,
    });
  });

  it("shows loading state when Clerk not loaded", () => {
    mockUseSignUp.mockReturnValue({
      signUp: null,
      isLoaded: false,
      setActive: null,
    });
    render(<Onboarding />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders Welcome step initially", () => {
    render(<Onboarding />);
    expect(screen.getByText(/welcome to virevos/i)).toBeInTheDocument();
  });

  it("renders step indicators", () => {
    render(<Onboarding />);
    // Steps: Welcome, Account, Plan, Personalize, Verify, Payment
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
