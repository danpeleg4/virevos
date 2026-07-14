import React from "react";
import { render } from "vitest-browser-react";

import { HeroDemo } from "@/app/components/HeroDemo";

describe("HeroDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the idle greeting and all prompt chips", async () => {
    const screen = await render(<HeroDemo />);

    await expect
      .element(screen.getByText(/pick a prompt below to watch me work/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /set up an h-1b case/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /what's due this week\?/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /draft a welcome email/i }))
      .toBeInTheDocument();
  });

  it("shows the user prompt immediately and a typing indicator when a chip is clicked", async () => {
    const screen = await render(<HeroDemo />);

    await screen.getByRole("button", { name: /set up an h-1b case/i }).click();

    await expect
      .element(screen.getByText(/set up an h-1b case for maria chen/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/assistant is typing/i))
      .toBeInTheDocument();
    // Reply text is not revealed until the typing delay elapses.
    await expect
      .element(
        screen.getByText(/created the case and mapped out the full workflow/i)
      )
      .not.toBeInTheDocument();
  });

  it("reveals the AI reply and steps sequentially after the chip is clicked", async () => {
    const screen = await render(<HeroDemo />);

    await screen.getByRole("button", { name: /set up an h-1b case/i }).click();

    // After the typing delay, the reply appears and typing indicator is gone.
    await vi.advanceTimersByTimeAsync(700);
    await expect
      .element(
        screen.getByText(/created the case and mapped out the full workflow/i)
      )
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/assistant is typing/i))
      .not.toBeInTheDocument();

    // Once all steps have been scheduled, every action step is visible.
    await vi.advanceTimersByTimeAsync(3000);
    await expect
      .element(screen.getByText(/created case · h-1b transfer/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/added 6 tasks/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/scheduled rfe response deadline — jun 14/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/drafted the intake document checklist/i))
      .toBeInTheDocument();
  });

  it("switches scenarios when a different chip is clicked", async () => {
    const screen = await render(<HeroDemo />);

    await screen
      .getByRole("button", { name: /draft a welcome email/i })
      .click();
    await expect
      .element(screen.getByText(/draft a welcome email for a new f-1 student/i))
      .toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(3000);
    await expect
      .element(screen.getByText(/getting started with your f-1/i))
      .toBeInTheDocument();
    // The H-1B scenario's prompt should not be present.
    await expect
      .element(screen.getByText(/set up an h-1b case for maria chen/i))
      .not.toBeInTheDocument();
  });
});
