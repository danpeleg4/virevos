import React from "react";
import { render } from "vitest-browser-react";

import { Toaster } from "@/app/components/ui/toaster";
import {
  toast,
  dismissAllToasts,
  type ToastVariant,
} from "@/app/components/ui/toast-store";

describe("Toast", () => {
  afterEach(() => {
    dismissAllToasts();
  });

  it("renders a toast with title and description via the imperative API", async () => {
    const screen = await render(<Toaster />);

    toast({ title: "Saved", description: "Your changes were saved." });

    await expect
      .element(screen.getByText("Saved", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Your changes were saved.", { exact: true }))
      .toBeInTheDocument();
  });

  it("dismisses when the close button is clicked", async () => {
    const screen = await render(<Toaster />);

    toast({ title: "Dismiss me" });
    await expect
      .element(screen.getByText("Dismiss me", { exact: true }))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: /dismiss/i }).click();
    await expect
      .element(screen.getByText("Dismiss me", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("stacks multiple toasts", async () => {
    const screen = await render(<Toaster />);

    toast({ title: "First" });
    toast({ title: "Second" });

    await expect
      .element(screen.getByText("First", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Second", { exact: true }))
      .toBeInTheDocument();
  });

  it("fires the action callback and dismisses on click", async () => {
    const onClick = vi.fn();
    const screen = await render(<Toaster />);

    toast({ title: "Undo?", action: { label: "Undo", onClick } });
    await screen.getByRole("button", { name: "Undo" }).click();

    expect(onClick).toHaveBeenCalledTimes(1);
    await expect
      .element(screen.getByText("Undo?", { exact: true }))
      .not.toBeInTheDocument();
  });

  const variantCases: Array<{
    method: "success" | "destructive" | "error" | "warning" | "info";
    variant: ToastVariant;
  }> = [
    { method: "success", variant: "success" },
    { method: "destructive", variant: "destructive" },
    { method: "error", variant: "destructive" },
    { method: "warning", variant: "warning" },
    { method: "info", variant: "info" },
  ];

  for (const { method, variant } of variantCases) {
    it(`toast.${method} applies the ${variant} variant`, async () => {
      const screen = await render(<Toaster />);
      toast[method]({ title: `${method} toast` });

      const text = screen.getByText(`${method} toast`, { exact: true });
      await expect.element(text).toBeInTheDocument();
      const item = text.element().closest("li");
      expect(item).not.toBeNull();
      expect(item).toHaveAttribute("data-variant", variant);
    });
  }

  it("renders even when title and description are both omitted", async () => {
    const screen = await render(<Toaster />);
    const id = toast({});
    expect(id).toBeTruthy();
    await expect
      .element(screen.getByRole("status").first())
      .toBeInTheDocument();
  });

  describe("auto-dismiss", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it("automatically dismisses after the default duration", async () => {
      const screen = await render(<Toaster />);
      toast({ title: "Auto-dismiss" });
      await expect
        .element(screen.getByText("Auto-dismiss", { exact: true }))
        .toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(5000);
      await expect
        .element(screen.getByText("Auto-dismiss", { exact: true }))
        .not.toBeInTheDocument();
    });

    it("respects a custom duration and never dismisses when duration is 0", async () => {
      const screen = await render(<Toaster />);
      toast({ title: "Sticky", duration: 0 });

      await vi.advanceTimersByTimeAsync(60_000);
      await expect
        .element(screen.getByText("Sticky", { exact: true }))
        .toBeInTheDocument();
    });
  });
});
