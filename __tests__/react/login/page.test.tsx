import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = jest.fn();
const mockUseSignIn = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@clerk/nextjs", () => ({
  useSignIn: () => mockUseSignIn(),
}));

jest.mock("@radix-ui/themes", () => ({
  Callout: {
    Root: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Icon: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    Text: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}));

jest.mock("@radix-ui/react-icons", () => ({
  InfoCircledIcon: () => <span data-testid="info-icon" />,
}));

const mockSignIn = {
  create: jest.fn(),
  authenticateWithRedirect: jest.fn(),
  attemptFirstFactor: jest.fn(),
};
const mockSetActive = jest.fn();

import Login from "@/app/login/page";

describe("Login Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseSignIn.mockReturnValue({
      signIn: mockSignIn,
      isLoaded: true,
      setActive: mockSetActive,
    });
  });

  it("shows loading state when Clerk not loaded", () => {
    mockUseSignIn.mockReturnValue({
      signIn: null,
      isLoaded: false,
      setActive: null,
    });
    render(<Login />);
    // Loading spinner shown
    const sparkles = document.querySelector(".animate-pulse");
    expect(sparkles).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<Login />);
    expect(
      screen.getByPlaceholderText(/name@company\.com/i)
    ).toBeInTheDocument();
  });

  it("renders password input", () => {
    render(<Login />);
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });

  it("renders Sign In button", () => {
    render(<Login />);
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("renders Forgot Password link", () => {
    render(<Login />);
    expect(
      screen.getByRole("button", { name: /forgot password/i })
    ).toBeInTheDocument();
  });

  it("renders 'Create One Now' link", () => {
    render(<Login />);
    expect(
      screen.getByRole("button", { name: /create one now/i })
    ).toBeInTheDocument();
  });

  it("navigates to /onboard when 'Create One Now' is clicked", () => {
    render(<Login />);
    fireEvent.click(screen.getByRole("button", { name: /create one now/i }));
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("toggles password visibility when eye button is clicked", () => {
    render(<Login />);
    const passwordInput = screen.getByPlaceholderText(/••••••••/);
    expect(passwordInput).toHaveAttribute("type", "password");
    // Click the eye toggle
    const eyeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(eyeBtn);
    expect(screen.getByPlaceholderText(/••••••••/)).toHaveAttribute(
      "type",
      "text"
    );
  });
});
