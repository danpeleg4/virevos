import React from "react";
import { render } from "vitest-browser-react";

const mockSetTheme = vi.fn();
const mockUseTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => mockUseTheme(),
}));

import { ThemeToggle } from "@/app/components/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it("renders nothing (empty div) when theme is not yet resolved", async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: undefined,
      setTheme: mockSetTheme,
    });
    const { container } = await render(<ThemeToggle />);
    await expect.element(container.firstElementChild!).toBeEmptyDOMElement();
  });

  it("shows Moon icon when in light mode", async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: mockSetTheme,
    });
    const screen = await render(<ThemeToggle />);
    // Moon icon is shown in light mode (to switch to dark)
    await expect.element(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows Sun icon when in dark mode", async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    const screen = await render(<ThemeToggle />);
    await expect.element(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls setTheme('dark') when clicked in light mode", async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: mockSetTheme,
    });
    const screen = await render(<ThemeToggle />);
    await screen.getByRole("button").click();
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('light') when clicked in dark mode", async () => {
    mockUseTheme.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    const screen = await render(<ThemeToggle />);
    await screen.getByRole("button").click();
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });
});
