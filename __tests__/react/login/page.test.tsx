import React from "react";
import { render } from "vitest-browser-react";

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

  it("renders email input", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByPlaceholder(/name@company\.com/i))
      .toBeInTheDocument();
  });

  it("renders password input", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByPlaceholder(/••••••••/))
      .toBeInTheDocument();
  });

  it("renders Sign In button", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByRole("button", { name: /sign in/i }))
      .toBeInTheDocument();
  });

  it("renders Forgot Password link", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByRole("button", { name: /forgot password/i }))
      .toBeInTheDocument();
  });

  it("renders 'Create One Now' link", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByRole("button", { name: /create one now/i }))
      .toBeInTheDocument();
  });

  it("navigates to /onboard when 'Create One Now' is clicked", async () => {
    const screen = await render(<Login />);
    await screen.getByRole("button", { name: /create one now/i }).click();
    expect(mockPush).toHaveBeenCalledWith("/onboard");
  });

  it("toggles password visibility when eye button is clicked", async () => {
    const screen = await render(<Login />);
    await expect
      .element(screen.getByPlaceholder(/••••••••/))
      .toHaveAttribute("type", "password");
    await screen.getByRole("button", { name: /^$/ }).click();
    await expect
      .element(screen.getByPlaceholder(/••••••••/))
      .toHaveAttribute("type", "text");
  });

  it("shows error when sign-in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    const screen = await render(<Login />);
    await screen
      .getByPlaceholder(/name@company\.com/i)
      .fill("user@example.com");
    await screen.getByPlaceholder(/••••••••/).fill("wrong");
    await screen.getByRole("button", { name: /sign in/i }).click();
    await expect
      .element(screen.getByText(/invalid credentials/i))
      .toBeInTheDocument();
  });
});
