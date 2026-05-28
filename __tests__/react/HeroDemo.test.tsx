import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { HeroDemo } from "@/app/components/HeroDemo";

describe("HeroDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the idle greeting and all prompt chips", () => {
    render(<HeroDemo />);

    expect(
      screen.getByText(/pick a prompt below to watch me work/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /set up an h-1b case/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /what's due this week\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /draft a welcome email/i })
    ).toBeInTheDocument();
  });

  it("shows the user prompt immediately and a typing indicator when a chip is clicked", () => {
    render(<HeroDemo />);

    fireEvent.click(
      screen.getByRole("button", { name: /set up an h-1b case/i })
    );

    expect(
      screen.getByText(/set up an h-1b case for maria chen/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/assistant is typing/i)).toBeInTheDocument();
    // Reply text is not revealed until the typing delay elapses.
    expect(
      screen.queryByText(/created the case and mapped out the full workflow/i)
    ).not.toBeInTheDocument();
  });

  it("reveals the AI reply and steps sequentially after the chip is clicked", () => {
    render(<HeroDemo />);

    fireEvent.click(
      screen.getByRole("button", { name: /set up an h-1b case/i })
    );

    // After the typing delay, the reply appears and typing indicator is gone.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(
      screen.getByText(/created the case and mapped out the full workflow/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/assistant is typing/i)
    ).not.toBeInTheDocument();

    // Once all steps have been scheduled, every action step is visible.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(
      screen.getByText(/created case · h-1b transfer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/added 6 tasks/i)).toBeInTheDocument();
    expect(
      screen.getByText(/scheduled rfe response deadline — jun 14/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/drafted the intake document checklist/i)
    ).toBeInTheDocument();
  });

  it("switches scenarios when a different chip is clicked", () => {
    render(<HeroDemo />);

    fireEvent.click(
      screen.getByRole("button", { name: /draft a welcome email/i })
    );
    expect(
      screen.getByText(/draft a welcome email for a new f-1 student/i)
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(
      screen.getByText(/getting started with your f-1/i)
    ).toBeInTheDocument();
    // The H-1B scenario's prompt should not be present.
    expect(
      screen.queryByText(/set up an h-1b case for maria chen/i)
    ).not.toBeInTheDocument();
  });
});
