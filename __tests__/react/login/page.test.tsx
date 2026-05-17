import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabase: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      resetPasswordForEmail: (...args: unknown[]) =>
        mockResetPasswordForEmail(...args),
    },
  }),
}));

import Login from "@/app/login/page";

describe("Login Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSignInWithPassword.mockReset();
    mockResetPasswordForEmail.mockReset();
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
    const eyeBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(eyeBtn);
    expect(screen.getByPlaceholderText(/••••••••/)).toHaveAttribute(
      "type",
      "text"
    );
  });

  it("shows error when sign-in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/name@company\.com/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
