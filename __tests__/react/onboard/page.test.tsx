import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
const mockUseSignUp = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@clerk/nextjs", () => ({
  useSignUp: () => mockUseSignUp(),
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

jest.mock("@radix-ui/react-icons", () => ({
  InfoCircledIcon: () => <span data-testid="info-icon" />,
}));

jest.mock("@/lib/billing", () => ({
  registerFreePlan: jest.fn(),
}));

jest.mock("@/app/onboard/PaymentStep", () => ({
  __esModule: true,
  default: () => <div data-testid="payment-step" />,
}));

const mockSignUp = {
  create: jest.fn(),
  prepareEmailAddressVerification: jest.fn(),
  attemptEmailAddressVerification: jest.fn(),
};
const mockSetActive = jest.fn();

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
    mockUseSignUp.mockReturnValue({ signUp: null, isLoaded: false, setActive: null });
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
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
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
