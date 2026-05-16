import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockUseSignIn = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => mockUseSignIn(),
}));

const mockSignIn = {
  create: vi.fn(),
  authenticateWithRedirect: vi.fn(),
  attemptFirstFactor: vi.fn(),
};
const mockSetActive = vi.fn();

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
